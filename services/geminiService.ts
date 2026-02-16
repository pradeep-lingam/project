
import { GoogleGenAI, Type, Modality, LiveServerMessage } from "@google/genai";
import { IndianLanguage, TranslationResult, TranslationContext } from "../types";
import { decode, encode, decodeAudioData, createPcmBlob } from "../utils/audioUtils";

const INTERPRETER_SYSTEM_INSTRUCTION = `You are a world-class multilingual interpreter specializing in Indian languages. Your primary goal is "Intent-First Interpretation."

STRICT TRANSLATION RULES:
1. MEANING OVER WORDS: Identify the underlying intent and translate it into natural, fluent target language.
2. PROPER NOUNS & BRANDS: Names of people (e.g., 'Amit'), places (e.g., 'Mumbai'), brands (e.g., 'Google', 'WhatsApp', 'Apple'), and specific technical/medical terms MUST be transliterated phonetically into the target script. NEVER translate their literal meaning.
3. NUMBERS & PUNCTUATION: Preserve all numbers (e.g., '123', '50.5%') and punctuation (e.g., '!', '?', '-', '.') exactly as they appear in the original text.
4. NATIVE PHRASING: Output must sound like a native speaker using the target script. Avoid robotic or literal phrasing.

SILENT VERIFICATION PROTOCOL:
Before finalizing:
- CHECK 1: Is the original meaning preserved?
- CHECK 2: Is the phrasing natural for a native speaker?
- CHECK 3: Are proper nouns, brands, and technical terms phonetically transliterated rather than translated?
- CHECK 4: Are all numbers and punctuation preserved exactly?
If any check fails, rewrite the translation once. Output ONLY the final JSON result.

OUTPUT FORMAT:
Return a JSON object: {"translation": "...", "detectedSourceLanguage": "...", "confidenceScore": 0.0-1.0}`;

const TRANSLITERATOR_SYSTEM_INSTRUCTION = `You are a professional linguistic transliteration engine.
Your task is transliteration, NOT translation.

Rules:
- DO NOT TRANSLATE. DO NOT REPHRASE. DO NOT SUMMARIZE.
- Convert pronunciation from the source into the target script phonetically.
- CODE-MIXED INPUT: If the input is code-mixed, transliterate EACH word into the target script based on its pronunciation, without translating its meaning.
- TAMIL CONVENTIONS: For Tamil target script, strictly adhere to modern spoken Tamil transliteration conventions. Ensure that the written Tamil accurately represents the sounds in common parlance (e.g., handling the nuances of plosives being voiced or unvoiced correctly).
- Maintain original word order exactly.
- NAMES, BRANDS, & PLACES: Names of people, places, and brands MUST be transliterated phonetically, NOT translated.
- ENGLISH WORDS: If the source contains English words, transliterate them phonetically into the target script. Do NOT translate them into the target language's equivalent words.
- NUMBERS & PUNCTUATION: Preserve all numbers and punctuation marks exactly as they are in the original text.
- DO NOT add explanations or extra text.

SILENT VERIFICATION PROTOCOL:
Before finalizing, verify:
- No translation has occurred (meanings must not be swapped for equivalents).
- Pronunciation is accurate for a native speaker of the target language.
- Modern spoken conventions (especially for Tamil) are followed.
- Proper nouns and brands are preserved phonetically.
- Numbers and punctuation are untouched.
If incorrect, fix once. Output ONLY the final result.`;

export const translateContent = async (
  targetLanguage: IndianLanguage | 'English',
  sourceLanguage: string,
  text?: string,
  imageBase64?: string,
  mode: 'translate' | 'transliterate' = 'translate',
  context: TranslationContext = TranslationContext.Casual
): Promise<TranslationResult> => {
  if (!text && !imageBase64) return { text: "" };

  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  const modelName = 'gemini-3-flash-preview';

  try {
    const commonSchema = {
      type: Type.OBJECT,
      properties: {
        translation: { type: Type.STRING },
        detectedSourceLanguage: { type: Type.STRING },
        confidenceScore: { 
          type: Type.NUMBER,
          description: "A value from 0.0 to 1.0 representing confidence in the translation accuracy."
        }
      },
      required: ["translation", "detectedSourceLanguage", "confidenceScore"]
    };

    if (mode === 'transliterate') {
      const transliteratePrompt = `Task: Transliterate the text below phonetically into ${targetLanguage} script.

Source language/script: ${sourceLanguage}
Target language/script: ${targetLanguage}

Text:
"${text || "Content from image"}"

IMPORTANT:
- Do not translate meaning.
- If the target is Tamil, use modern spoken Tamil transliteration conventions.
- If the input is code-mixed, transliterate each word into ${targetLanguage} script based on pronunciation, without translating meaning.
- If the source contains English words, transliterate them phonetically. Do NOT translate them.
- Names of people, places, and brands must be transliterated phonetically, not translated.
- Preserve numbers and punctuation exactly as in the original text.
- Output ONLY the phonetic transliteration.`;

      const contents = imageBase64 
        ? { parts: [{ inlineData: { mimeType: 'image/jpeg', data: imageBase64 } }, { text: transliteratePrompt }] }
        : transliteratePrompt;

      const response = await ai.models.generateContent({
        model: modelName,
        contents,
        config: {
          systemInstruction: TRANSLITERATOR_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: commonSchema
        },
      });

      const result = JSON.parse(response.text || "{}");
      return { 
        text: result.translation, 
        detectedSourceLanguage: result.detectedSourceLanguage,
        confidenceScore: result.confidenceScore
      };
    }

    // Translation Path
    if (imageBase64) {
      const prompt = `Translate image text to ${targetLanguage} (${context} tone). 
      Names of people, places, and brands MUST be transliterated phonetically, not translated.
      Preserve all numbers and punctuation exactly as in the original image.
      Use meaning-based translation for everything else.`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: {
          parts: [
            { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
            { text: prompt }
          ]
        },
        config: { 
          systemInstruction: INTERPRETER_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: commonSchema
        }
      });

      const json = JSON.parse(response.text || "{}");
      return { 
        text: json.translation, 
        detectedSourceLanguage: json.detectedSourceLanguage,
        confidenceScore: json.confidenceScore
      };
    } 
    
    else if (text) {
      const prompt = `Translate to ${targetLanguage} (Context: ${context}): "${text}". 
      Names of people, places, and brands MUST be transliterated phonetically, not translated.
      Preserve all numbers and punctuation exactly as in the source.
      Mixed language input should result in pure target language output while preserving proper nouns phonetically.`;

      const response = await ai.models.generateContent({
        model: modelName,
        contents: prompt,
        config: {
          systemInstruction: INTERPRETER_SYSTEM_INSTRUCTION,
          responseMimeType: 'application/json',
          responseSchema: commonSchema
        },
      });

      const result = JSON.parse(response.text || "{}");
      return { 
        text: result.translation, 
        detectedSourceLanguage: result.detectedSourceLanguage,
        confidenceScore: result.confidenceScore
      };
    }

    return { text: "" };
  } catch (error: any) {
    throw error;
  }
};

export const generateSpeech = async (text: string): Promise<string> => {
  if (!text.trim()) return "";
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  try {
    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-preview-tts",
      contents: [{ parts: [{ text }] }],
      config: {
        responseModalities: [Modality.AUDIO],
        speechConfig: {
          voiceConfig: {
            prebuiltVoiceConfig: { voiceName: 'Kore' }
          },
        },
      },
    });
    return response.candidates?.[0]?.content?.parts?.[0]?.inlineData?.data || "";
  } catch (error) {
    throw new Error("Audio generation failed.");
  }
};

export class LiveSessionManager {
  private session: any = null;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private stream: MediaStream | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();

  public onInputAudio: ((analyser: AnalyserNode) => void) | null = null;
  public onOutputAudio: ((analyser: AnalyserNode) => void) | null = null;
  public onError: ((err: string) => void) | null = null;

  async connect(targetLanguage: string) {
    const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
    try {
      this.inputAudioContext = new AudioContext({ sampleRate: 16000 });
      this.outputAudioContext = new AudioContext({ sampleRate: 24000 });
      const inputAnalyser = this.inputAudioContext.createAnalyser();
      const outputAnalyser = this.outputAudioContext.createAnalyser();
      
      if (this.onInputAudio) this.onInputAudio(inputAnalyser);
      if (this.onOutputAudio) this.onOutputAudio(outputAnalyser);

      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      
      const sessionPromise = ai.live.connect({
        model: 'gemini-2.5-flash-native-audio-preview-12-2025',
        callbacks: {
          onopen: () => {
            const source = this.inputAudioContext!.createMediaStreamSource(this.stream!);
            const scriptProcessor = this.inputAudioContext!.createScriptProcessor(4096, 1, 1);
            scriptProcessor.onaudioprocess = (e) => {
              const pcmBlob = createPcmBlob(e.inputBuffer.getChannelData(0));
              sessionPromise.then(s => s.sendRealtimeInput({ media: pcmBlob }));
            };
            source.connect(inputAnalyser);
            inputAnalyser.connect(scriptProcessor);
            scriptProcessor.connect(this.inputAudioContext!.destination);
          },
          onmessage: async (msg: LiveServerMessage) => {
            const audioData = msg.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
            if (audioData) {
              this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext!.currentTime);
              const buffer = await decodeAudioData(decode(audioData), this.outputAudioContext!);
              const source = this.outputAudioContext!.createBufferSource();
              source.buffer = buffer;
              source.connect(outputAnalyser);
              outputAnalyser.connect(this.outputAudioContext!.destination);
              source.start(this.nextStartTime);
              this.nextStartTime += buffer.duration;
              this.sources.add(source);
              source.onended = () => this.sources.delete(source);
            }
          },
          onerror: (e: any) => this.onError?.(e.message),
        },
        config: {
          responseModalities: [Modality.AUDIO],
          systemInstruction: `Real-time interpreter for English and ${targetLanguage}. 
          Names of people, places, and brands MUST be transliterated phonetically, NOT translated.
          Identify intent and speak in natural fluent target script. Preserve all numbers and punctuation.
          Silently verify natural phrasing and phonetic preservation before speaking.`,
          speechConfig: { voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Zephyr' } } },
        },
      });
      this.session = await sessionPromise;
    } catch (err: any) {
      this.onError?.("Microphone access denied.");
    }
  }

  disconnect() {
    this.session?.close();
    this.stream?.getTracks().forEach(t => t.stop());
    this.inputAudioContext?.close();
    this.outputAudioContext?.close();
    this.sources.forEach(s => s.stop());
  }
}
