import { GoogleGenAI, Type, LiveServerMessage, Modality } from "@google/genai";
import { IndianLanguage, TranslationResult } from "../types";
import { createPcmBlob, decodeAudioData, base64ToUint8Array } from "../utils/audioUtils";

// Ensure API Key is present
const API_KEY = process.env.API_KEY || '';
const ai = new GoogleGenAI({ apiKey: API_KEY });

/**
 * Translates or Transliterates text/image content.
 */
export const translateContent = async (
  targetLanguage: IndianLanguage | 'English',
  sourceLanguage: string,
  text?: string,
  imageBase64?: string,
  mode: 'translate' | 'transliterate' = 'translate'
): Promise<TranslationResult> => {
  if (!text && !imageBase64) return { text: "" };

  try {
    // 1. Image Translation/Transliteration (using gemini-2.5-flash-image)
    if (imageBase64) {
      const taskInstruction = mode === 'transliterate'
        ? `Transliterate any text found into ${targetLanguage} script. Keep the original pronunciation and words, just convert the script. Do NOT translate the meaning.`
        : `Translate it into ${targetLanguage}.`;

      const parts: any[] = [
        {
          inlineData: {
            mimeType: 'image/jpeg',
            data: imageBase64
          }
        },
        {
          text: `Analyze this image. Detect the language of any text found. ${taskInstruction}
                 If there is no text, describe the image in ${targetLanguage}.
                 Return the result in the following JSON format:
                 { "translation": "THE_RESULT_TEXT", "detectedSourceLanguage": "THE_DETECTED_LANGUAGE" }`
        }
      ];

      if (text) {
        parts.push({ text: `Additional Context: ${text}` });
      }

      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image',
        contents: { parts },
        config: { responseMimeType: 'application/json' }
      });

      const rawText = response.text || "{}";
      try {
        const json = JSON.parse(rawText);
        return {
          text: json.translation || "Processing failed.",
          detectedSourceLanguage: json.detectedSourceLanguage
        };
      } catch (e) {
        return { text: rawText };
      }
    } 
    
    // 2. Text-only Translation/Transliteration (using gemini-3-flash-preview)
    else if (text) {
      const sourcePrompt = sourceLanguage === 'Auto-detect' 
        ? "Detect the language of the text." 
        : `The source language is ${sourceLanguage}.`;

      let taskPrompt = "";
      if (mode === 'transliterate') {
        taskPrompt = `Transliterate the text into ${targetLanguage} script. Strictly preserve the sound and words of the original text. Do NOT translate the meaning. Example: "Namaste" -> "नमस्ते".`;
      } else {
        taskPrompt = `Translate the following text to ${targetLanguage}.`;
      }

      const response = await ai.models.generateContent({
        model: 'gemini-3-flash-preview',
        contents: `${sourcePrompt} ${taskPrompt} \n\nText: "${text}"`,
        config: {
          responseMimeType: 'application/json',
          responseSchema: {
            type: Type.OBJECT,
            properties: {
              translation: { type: Type.STRING },
              detectedSourceLanguage: { type: Type.STRING }
            },
            required: ["translation", "detectedSourceLanguage"]
          }
        },
      });

      const result = JSON.parse(response.text || "{}");
      return {
        text: result.translation || "Processing failed.",
        detectedSourceLanguage: result.detectedSourceLanguage
      };
    }

    return { text: "" };

  } catch (error) {
    console.error("Gemini API error:", error);
    throw error;
  }
};

/**
 * Generates audio from text using the TTS model.
 */
export const generateSpeech = async (text: string): Promise<string> => {
  if (!text.trim()) return "";
  
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' },
          },
        },
      },
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  } catch (error) {
    console.error("Speech generation error:", error);
    throw error;
  }
};

/**
 * Manages the Live API session for real-time interpretation.
 */
export class LiveSessionManager {
  private inputContext: AudioContext | null = null;
  private outputContext: AudioContext | null = null;
  private mediaStream: MediaStream | null = null;
  private currentSessionPromise: Promise<any> | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();

  public onInputAudio: ((analyser: AnalyserNode) => void) | null = null;
  public onOutputAudio: ((analyser: AnalyserNode) => void) | null = null;
  public onError: ((error: string) => void) | null = null;

  async connect(targetLanguage: string) {
    try {
      this.inputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      
      const inputAnalyser = this.inputContext.createAnalyser();
      const outputAnalyser = this.outputContext.createAnalyser();
      
      if (this.onInputAudio) this.onInputAudio(inputAnalyser);
      if (this.onOutputAudio) this.onOutputAudio(outputAnalyser);

      this.mediaStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      this.currentSessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } }
          },
          systemInstruction: `You are a professional simultaneous interpreter. 
          Your task is to translate spoken content between English and ${targetLanguage}. 
          If you hear English, translate it to ${targetLanguage}. 
          If you hear ${targetLanguage}, translate it to English. 
          Keep translations accurate and natural. Do not add conversational filler.`,
        },
        callbacks: {
          onopen: () => {
             console.log("Live session connected");
             this.startInputStream(inputAnalyser);
          },
          onmessage: async (msg: LiveServerMessage) => {
             await this.handleMessage(msg, outputAnalyser);
          },
          onclose: () => {
             console.log("Session closed");
          },
          onerror: (err) => {
             console.error(err);
             if (this.onError) this.onError("Connection error occurred.");
          }
        }
      });
      
    } catch (err) {
      console.error(err);
      if (this.onError) this.onError(err instanceof Error ? err.message : "Failed to start session.");
    }
  }

  private startInputStream(analyser: AnalyserNode) {
     if (!this.inputContext || !this.mediaStream) return;
     
     const source = this.inputContext.createMediaStreamSource(this.mediaStream);
     const processor = this.inputContext.createScriptProcessor(4096, 1, 1);
     
     processor.onaudioprocess = (e) => {
       const inputData = e.inputBuffer.getChannelData(0);
       const pcmBlob = createPcmBlob(inputData);
       
       this.currentSessionPromise?.then(session => {
          session.sendRealtimeInput({ media: pcmBlob });
       });
     };
     
     source.connect(analyser);
     analyser.connect(processor);
     processor.connect(this.inputContext.destination);
  }

  private async handleMessage(message: LiveServerMessage, analyser: AnalyserNode) {
     if (!this.outputContext) return;

     const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
     if (base64Audio) {
       try {
         const audioData = base64ToUint8Array(base64Audio);
         const buffer = await decodeAudioData(audioData, this.outputContext, 24000, 1);
         
         this.nextStartTime = Math.max(this.outputContext.currentTime, this.nextStartTime);
         
         const source = this.outputContext.createBufferSource();
         source.buffer = buffer;
         source.connect(analyser);
         analyser.connect(this.outputContext.destination);
         
         source.start(this.nextStartTime);
         this.nextStartTime += buffer.duration;
         
         this.sources.add(source);
         source.onended = () => this.sources.delete(source);
       } catch (e) {
         console.error("Error decoding audio", e);
       }
     }
     
     if (message.serverContent?.interrupted) {
       this.sources.forEach(s => s.stop());
       this.sources.clear();
       this.nextStartTime = 0;
     }
  }

  disconnect() {
    if (this.currentSessionPromise) {
        this.currentSessionPromise.then(session => session.close());
        this.currentSessionPromise = null;
    }
    
    if (this.mediaStream) {
        this.mediaStream.getTracks().forEach(t => t.stop());
        this.mediaStream = null;
    }
    
    if (this.inputContext) {
        this.inputContext.close();
        this.inputContext = null;
    }
    
    if (this.outputContext) {
        this.outputContext.close();
        this.outputContext = null;
    }
    
    this.sources.clear();
    this.nextStartTime = 0;
  }
}