
import React, { useState, useRef, useEffect } from 'react';
import { IndianLanguage, TranslationContext } from '../types';
import { LanguageSelect } from '../components/LanguageSelect';
import { translateContent, generateSpeech } from '../services/geminiService';
import { base64ToUint8Array, decodeAudioData } from '../utils/audioUtils';

interface TranslatorViewProps {
  isDarkMode: boolean;
}

export const TranslatorView: React.FC<TranslatorViewProps> = ({ isDarkMode }) => {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  const [sourceLang, setSourceLang] = useState<string>('Auto-detect');
  const [targetLang, setTargetLang] = useState<string>(IndianLanguage.Hindi);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);
  const [context, setContext] = useState<TranslationContext>(TranslationContext.Casual);
  const [mode, setMode] = useState<'translate' | 'transliterate'>('translate');
  const [isLoading, setIsLoading] = useState(false);
  const [isSpeakingSource, setIsSpeakingSource] = useState(false);
  const [isSpeakingTarget, setIsSpeakingTarget] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  const hasContent = sourceText.trim().length > 0 || selectedImage !== null;
  const wordCount = sourceText.trim() === '' ? 0 : sourceText.trim().split(/\s+/).length;
  const charCount = sourceText.length;

  /**
   * Refined error handler for Indian context and Gemini API patterns.
   */
  function getUserFriendlyError(err: any): string {
    if (!navigator.onLine) {
      return "No internet connection. Please check your network.";
    }

    const status = err?.status || err?.response?.status;

    if (status === 401) {
      return "Authentication error. Please sign in again.";
    }

    if (status === 429 || err?.message?.includes('429')) {
      return "You’re translating too fast. Please slow down.";
    }

    if (status >= 500) {
      return "Our servers are having trouble. Please try later.";
    }

    if (err?.message?.toLowerCase().includes("safety")) {
      return "The content was flagged by our safety filters.";
    }

    return "Something went wrong. Please try again.";
  }

  useEffect(() => {
    if (errorMessage) {
      const timer = setTimeout(() => setErrorMessage(null), 6000);
      return () => clearTimeout(timer);
    }
  }, [errorMessage]);

  useEffect(() => {
    textAreaRef.current?.focus();
    return () => { audioContextRef.current?.close(); };
  }, []);

  const handleTranslate = async () => {
    if (!hasContent) return;
    setIsLoading(true);
    setDetectedLang(null);
    setErrorMessage(null);

    try {
      const result = await translateContent(
        targetLang as IndianLanguage, 
        sourceLang,
        sourceText, 
        selectedImage || undefined,
        mode,
        context
      );
      setTargetText(result.text);
      if (result.detectedSourceLanguage && sourceLang === 'Auto-detect') {
        setDetectedLang(result.detectedSourceLanguage);
      }
    } catch (err: any) {
      setErrorMessage(getUserFriendlyError(err));
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaySpeech = async (text: string, setSpeaking: (val: boolean) => void) => {
    if (!text.trim()) return;
    setSpeaking(true);
    setErrorMessage(null);
    try {
      if (!audioContextRef.current) audioContextRef.current = new AudioContext({ sampleRate: 24000 });
      const base64Audio = await generateSpeech(text);
      if (base64Audio) {
        const audioData = base64ToUint8Array(base64Audio);
        const buffer = await decodeAudioData(audioData, audioContextRef.current);
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setSpeaking(false);
        source.start(0);
      } else {
        setSpeaking(false);
      }
    } catch (err: any) {
      setSpeaking(false);
      setErrorMessage(getUserFriendlyError(err));
    }
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
          setErrorMessage("Image too large. Please select an image under 5MB.");
          return;
      }
      const reader = new FileReader();
      reader.onloadend = () => {
        setSelectedImage((reader.result as string).split(',')[1]);
        setErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const clearAll = () => {
    setSourceText('');
    setTargetText('');
    setDetectedLang(null);
    setSelectedImage(null);
    setErrorMessage(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
    textAreaRef.current?.focus();
  };

  const handleCopy = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
    }
  };

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-4 lg:p-10 gap-8 lg:gap-10 relative">
      
      {/* Enhanced Toast Notification */}
      {errorMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none">
          <div className={`pointer-events-auto flex items-center gap-3 p-4 rounded-2xl border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-xl ${
            isDarkMode ? 'bg-red-900/40 border-red-500/30 text-red-100' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className={`p-2 rounded-full ${isDarkMode ? 'bg-red-500/20' : 'bg-red-100'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-semibold flex-1 leading-tight">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="p-1 hover:opacity-70 transition-opacity">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex justify-center">
         <div className={`backdrop-blur-xl p-1.5 rounded-full inline-flex items-center gap-1 shadow-2xl border transition-all duration-500 ${isDarkMode ? 'bg-slate-900/60 border-white/5' : 'bg-white/60 border-slate-200'}`}>
            <button onClick={() => setMode('translate')} className={`px-10 py-2.5 rounded-full text-sm font-bold transition-all ${mode === 'translate' ? (isDarkMode ? 'bg-white text-slate-950' : 'bg-slate-900 text-white') : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')}`}>Translation</button>
            <button onClick={() => setMode('transliterate')} className={`px-10 py-2.5 rounded-full text-sm font-bold transition-all ${mode === 'transliterate' ? (isDarkMode ? 'bg-white text-slate-950' : 'bg-slate-900 text-white') : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')}`}>Transliteration</button>
         </div>
      </div>

      {/* Settings Panel */}
      <div className={`backdrop-blur-2xl p-6 lg:p-7 rounded-[32px] shadow-xl border flex flex-col gap-6 z-20 relative transition-all duration-500 ${isDarkMode ? 'bg-slate-900/70 border-white/5' : 'bg-white/70 border-slate-200'}`}>
         <div className="flex flex-col lg:flex-row gap-6 items-end justify-between w-full">
            <div className="flex flex-col md:flex-row gap-5 items-center w-full lg:w-auto">
                <div className="w-full sm:w-64">
                  <LanguageSelect label="Translate from" value={sourceLang} onChange={setSourceLang} includeAutoDetect includeEnglish isDarkMode={isDarkMode} />
                </div>
                <div className="w-full sm:w-64">
                  <LanguageSelect label="Translate to" value={targetLang} onChange={setTargetLang} isDarkMode={isDarkMode} />
                </div>
            </div>
            {mode === 'translate' && (
              <div className="w-full lg:w-64 flex flex-col gap-1.5">
                <label className={`text-[11px] font-bold uppercase tracking-widest pl-1 ${isDarkMode ? 'text-slate-500' : 'text-slate-400'}`}>Context</label>
                <select value={context} onChange={(e) => setContext(e.target.value as TranslationContext)} className={`w-full border px-4 py-3 rounded-xl focus:outline-none transition-all text-sm font-semibold ${isDarkMode ? 'bg-slate-950/40 border-white/5 text-slate-200' : 'bg-white border-slate-200 text-slate-800'}`}>
                    <option value={TranslationContext.Casual}>Casual</option>
                    <option value={TranslationContext.Formal}>Formal</option>
                    <option value={TranslationContext.Healthcare}>Healthcare</option>
                    <option value={TranslationContext.Professional}>Professional</option>
                    <option value={TranslationContext.Emotional}>Emotional</option>
                </select>
              </div>
            )}
            <div className="w-full lg:w-auto pt-4 lg:pt-0 flex items-center gap-4 justify-end">
                {hasContent && <button onClick={clearAll} className={`px-5 py-3.5 text-sm font-bold rounded-2xl ${isDarkMode ? 'text-slate-500 hover:text-red-400' : 'text-slate-400 hover:text-red-500'}`}>Clear</button>}
                <button onClick={handleTranslate} disabled={isLoading || !hasContent} className={`px-10 py-4 rounded-2xl font-bold text-white transition-all transform active:scale-95 ${isLoading || !hasContent ? (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-400') : 'bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-600/30'}`}>
                    {isLoading ? "Thinking..." : "Translate"}
                </button>
            </div>
         </div>
      </div>

      {/* Main Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 min-h-[500px] mb-8">
        <div className={`backdrop-blur-xl rounded-[32px] border flex flex-col overflow-hidden relative transition-all duration-500 ${isDarkMode ? 'bg-slate-900/60 border-white/5 focus-within:ring-4 focus-within:ring-indigo-500/10' : 'bg-white shadow-sm border-slate-200 focus-within:ring-4 focus-within:ring-indigo-500/5'}`}>
          <div className={`px-7 py-5 border-b flex justify-between items-center ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-slate-50 border-slate-200'}`}>
            <div className="flex gap-4 items-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-widest">Input</span>
              {detectedLang && sourceLang === 'Auto-detect' && (
                <span className="text-[10px] bg-indigo-500/10 text-indigo-400 px-2 py-0.5 rounded-full font-bold uppercase tracking-widest border border-indigo-500/20">{detectedLang}</span>
              )}
            </div>
            <div className="flex gap-2">
              <button onClick={() => handlePlaySpeech(sourceText, setIsSpeakingSource)} className="p-2 hover:bg-white/10 rounded-lg text-slate-500" title="Listen"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
              <button onClick={() => handleCopy(sourceText)} className="p-2 hover:bg-white/10 rounded-lg text-slate-500" title="Copy"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg></button>
              <button onClick={() => fileInputRef.current?.click()} className="p-2 hover:bg-white/10 rounded-lg text-slate-500" title="Upload Image"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" /></svg></button>
            </div>
          </div>
          <div className="flex-1 p-8 flex flex-col">
            {selectedImage && (
              <div className="relative inline-block mb-4 group">
                <img src={`data:image/jpeg;base64,${selectedImage}`} className="h-32 w-auto object-contain rounded-xl border border-white/10 shadow-xl" />
                <button onClick={() => setSelectedImage(null)} className="absolute -top-2 -right-2 bg-red-500 text-white p-1 rounded-full shadow-lg scale-0 group-hover:scale-100 transition-transform duration-200">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
              </div>
            )}
            <textarea ref={textAreaRef} className={`w-full h-full resize-none outline-none text-2xl bg-transparent leading-relaxed font-semibold ${isDarkMode ? 'text-white placeholder-slate-800' : 'text-slate-800 placeholder-slate-200'}`} placeholder="Enter text..." value={sourceText} onChange={(e) => setSourceText(e.target.value)} />
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" />
          </div>
          <div className={`p-4 text-[10px] font-bold uppercase tracking-widest text-right opacity-30 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
            {wordCount} Words | {charCount} Characters
          </div>
        </div>

        <div className={`backdrop-blur-2xl rounded-[32px] border flex flex-col overflow-hidden relative transition-all duration-700 ${isDarkMode ? 'bg-indigo-950/20 border-white/5' : 'bg-indigo-50 border-white/50 shadow-sm'}`}>
           <div className={`px-7 py-5 border-b flex justify-between items-center ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white/40 border-slate-200/50'}`}>
            <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Interpretation</span>
            <div className="flex gap-2">
              <button onClick={() => handlePlaySpeech(targetText, setIsSpeakingTarget)} disabled={!targetText} className="p-2 hover:bg-indigo-500/10 rounded-lg text-indigo-500 disabled:opacity-30" title="Listen"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" /></svg></button>
              <button onClick={() => handleCopy(targetText)} disabled={!targetText} className="p-2 hover:bg-indigo-500/10 rounded-lg text-indigo-500 disabled:opacity-30" title="Copy"><svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" /></svg></button>
            </div>
          </div>
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar">
            <p className={`text-2xl leading-relaxed font-semibold whitespace-pre-wrap ${targetText ? (isDarkMode ? 'text-slate-100' : 'text-slate-900') : 'text-slate-500 opacity-20 italic'}`}>{targetText || "Translation will appear here..."}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
