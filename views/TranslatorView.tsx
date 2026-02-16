
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

  function getUserFriendlyError(err: any): string {
    if (!navigator.onLine) return "No internet connection. Please check your network.";
    const status = err?.status || err?.response?.status;
    if (status === 401) return "Authentication error. Please sign in again.";
    if (status === 429 || err?.message?.includes('429')) return "You’re translating too fast. Please slow down.";
    if (status >= 500) return "Our servers are having trouble. Please try later.";
    if (err?.message?.toLowerCase().includes("safety")) return "The content was flagged by our safety filters.";
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
    <div className="flex flex-col h-full max-w-7xl mx-auto p-4 lg:p-8 xl:p-12 gap-8 lg:gap-12 relative">
      
      {/* Toast Notification */}
      {errorMessage && (
        <div className="fixed top-24 left-1/2 -translate-x-1/2 z-[100] w-full max-w-md px-4 pointer-events-none">
          <div className={`pointer-events-auto flex items-center gap-4 p-5 rounded-[24px] border shadow-2xl animate-in fade-in slide-in-from-top-4 duration-300 backdrop-blur-2xl ${
            isDarkMode ? 'bg-red-900 border-red-500/50 text-red-50' : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <div className={`p-3 rounded-full shrink-0 ${isDarkMode ? 'bg-red-500/30 text-red-300' : 'bg-red-100 text-red-500'}`}>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <p className="text-sm font-bold flex-1 leading-normal">{errorMessage}</p>
            <button onClick={() => setErrorMessage(null)} className="p-2 hover:bg-black/10 rounded-full transition-colors">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {/* Modern Mode Toggle */}
      <div className="flex justify-center mt-2">
         <div className={`backdrop-blur-3xl p-1.5 rounded-full inline-flex items-center gap-1 shadow-[0_20px_50px_rgba(0,0,0,0.2)] border transition-all duration-700 ${isDarkMode ? 'bg-slate-800 border-white/20' : 'bg-white/80 border-slate-200'}`}>
            <button onClick={() => setMode('translate')} className={`relative px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-500 overflow-hidden group ${mode === 'translate' ? (isDarkMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-white') : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')}`}>
              <span className="relative z-10">Translation</span>
            </button>
            <button onClick={() => setMode('transliterate')} className={`relative px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all duration-500 overflow-hidden group ${mode === 'transliterate' ? (isDarkMode ? 'bg-indigo-600 text-white shadow-lg' : 'bg-slate-900 text-white') : (isDarkMode ? 'text-slate-400 hover:text-white' : 'text-slate-500 hover:text-slate-800')}`}>
              <span className="relative z-10">Transliteration</span>
            </button>
         </div>
      </div>

      {/* Enhanced Settings Panel */}
      <div className={`backdrop-blur-3xl p-8 rounded-[40px] shadow-2xl border flex flex-col gap-8 z-20 relative transition-all duration-1000 group/panel ${isDarkMode ? 'bg-slate-900 border-white/10 hover:border-white/20 shadow-black/40' : 'bg-white/70 border-slate-200/60 hover:border-slate-300'}`}>
         <div className="flex flex-col xl:flex-row gap-8 items-end justify-between w-full">
            <div className="flex flex-col md:flex-row gap-6 items-center w-full xl:w-auto">
                <div className="w-full sm:w-72">
                  <LanguageSelect label="Translate from" value={sourceLang} onChange={setSourceLang} includeAutoDetect includeEnglish isDarkMode={isDarkMode} />
                </div>
                <div className={`flex items-center justify-center p-2 rounded-full transition-transform duration-500 hover:rotate-180 cursor-pointer hidden md:flex ${isDarkMode ? 'hover:bg-white/5' : 'hover:bg-black/5'}`}>
                  <svg xmlns="http://www.w3.org/2000/svg" className={`h-5 w-5 ${isDarkMode ? 'text-indigo-400' : 'text-slate-400'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </div>
                <div className="w-full sm:w-72">
                  <LanguageSelect label="Translate to" value={targetLang} onChange={setTargetLang} isDarkMode={isDarkMode} />
                </div>
            </div>
            
            <div className="flex flex-col md:flex-row gap-6 items-end w-full xl:w-auto">
              {mode === 'translate' && (
                <div className="w-full sm:w-64 flex flex-col gap-2">
                  <label className={`text-[10px] font-black uppercase tracking-widest pl-1 ${isDarkMode ? 'text-indigo-400' : 'text-slate-400'}`}>Tonal Context</label>
                  <select 
                    value={context} 
                    onChange={(e) => setContext(e.target.value as TranslationContext)} 
                    className={`w-full border px-5 py-4 rounded-2xl focus:outline-none transition-all text-sm font-bold shadow-sm ${
                      isDarkMode 
                      ? 'bg-slate-800 border-white/10 text-slate-100 focus:border-indigo-500' 
                      : 'bg-white border-slate-200 text-slate-800 focus:border-indigo-500/30'
                    }`}
                  >
                      <option value={TranslationContext.Casual}>Casual</option>
                      <option value={TranslationContext.Formal}>Formal</option>
                      <option value={TranslationContext.Healthcare}>Healthcare</option>
                      <option value={TranslationContext.Professional}>Professional</option>
                      <option value={TranslationContext.Emotional}>Emotional</option>
                  </select>
                </div>
              )}
              <div className="flex items-center gap-4 w-full md:w-auto pt-4 md:pt-0">
                  {hasContent && (
                    <button 
                      onClick={clearAll} 
                      className={`px-6 py-4 text-xs font-black uppercase tracking-widest rounded-2xl transition-all duration-300 hover:scale-105 active:scale-95 ${
                        isDarkMode ? 'text-slate-400 hover:text-red-400' : 'text-slate-400 hover:text-red-500'
                      }`}
                    >
                      Reset
                    </button>
                  )}
                  <button 
                    onClick={handleTranslate} 
                    disabled={isLoading || !hasContent} 
                    className={`flex-1 md:flex-none px-12 py-4.5 rounded-2xl font-black text-xs uppercase tracking-widest text-white transition-all transform active:scale-95 shadow-xl disabled:opacity-30 disabled:pointer-events-none hover:shadow-2xl hover:-translate-y-0.5 ${
                      isLoading || !hasContent ? 'bg-slate-700 text-slate-500' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30'
                    }`}
                  >
                      {isLoading ? (
                        <div className="flex items-center gap-3">
                          <svg className="animate-spin h-4 w-4 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                          <span>Thinking...</span>
                        </div>
                      ) : "Apply Magic"}
                  </button>
              </div>
            </div>
         </div>
      </div>

      {/* Main Content Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12 min-h-[520px] mb-12">
        {/* Input Card */}
        <div className={`group/card backdrop-blur-3xl rounded-[40px] border flex flex-col overflow-hidden relative transition-all duration-700 shadow-lg ${isDarkMode ? 'bg-slate-900 border-white/10 focus-within:border-indigo-500 focus-within:shadow-indigo-500/20 shadow-black/40' : 'bg-white border-slate-200 focus-within:border-indigo-400/50 focus-within:shadow-indigo-500/5'}`}>
          <div className={`px-8 py-6 border-b flex justify-between items-center transition-colors duration-500 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50/50 border-slate-200'}`}>
            <div className="flex gap-4 items-center">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-slate-400'}`}>Input Stream</span>
              {detectedLang && sourceLang === 'Auto-detect' && (
                <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-indigo-500/20 border border-indigo-500/30">
                  <span className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse"></span>
                  <span className="text-[9px] text-indigo-300 font-black uppercase tracking-widest">{detectedLang}</span>
                </div>
              )}
            </div>
            <div className="flex gap-2">
              <button 
                onClick={() => handlePlaySpeech(sourceText, setIsSpeakingSource)} 
                className={`p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'text-slate-300 hover:text-indigo-400 hover:bg-white/10' : 'text-slate-400 hover:text-indigo-600 hover:bg-black/5'}`} 
                title="Listen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              <button 
                onClick={() => handleCopy(sourceText)} 
                className={`p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'text-slate-300 hover:text-indigo-400 hover:bg-white/10' : 'text-slate-400 hover:text-indigo-600 hover:bg-black/5'}`} 
                title="Copy"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
              <button 
                onClick={() => fileInputRef.current?.click()} 
                className={`p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 ${isDarkMode ? 'text-slate-300 hover:text-indigo-400 hover:bg-white/10' : 'text-slate-400 hover:text-indigo-600 hover:bg-black/5'}`} 
                title="Visual Translation"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
          </div>
          
          <div className="flex-1 p-10 flex flex-col group/inner relative">
            {selectedImage && (
              <div className="relative inline-block mb-6 group/img">
                <div className="absolute inset-0 bg-indigo-500/20 blur-2xl rounded-full scale-75 opacity-0 group-hover/img:opacity-100 transition-opacity"></div>
                <img src={`data:image/jpeg;base64,${selectedImage}`} className="relative h-44 w-auto object-contain rounded-3xl border border-white/20 shadow-2xl transition-transform duration-500 group-hover/img:scale-105" />
                <button 
                  onClick={() => setSelectedImage(null)} 
                  className="absolute -top-3 -right-3 bg-red-500 text-white p-2 rounded-full shadow-2xl scale-0 group-hover/img:scale-100 transition-all hover:bg-red-600 active:scale-90"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            )}
            <textarea 
              ref={textAreaRef} 
              className={`w-full h-full resize-none outline-none text-2xl xl:text-3xl bg-transparent leading-relaxed font-bold transition-all ${
                isDarkMode 
                ? 'text-white placeholder-slate-600' 
                : 'text-slate-800 placeholder-slate-200'
              }`} 
              placeholder="Start your thought..." 
              value={sourceText} 
              onChange={(e) => setSourceText(e.target.value)} 
            />
            <input type="file" ref={fileInputRef} onChange={handleImageUpload} className="hidden" accept="image/*" />
          </div>
          
          <div className={`px-8 py-5 text-[9px] font-black uppercase tracking-[0.2em] flex justify-between items-center transition-opacity duration-700 ${isDarkMode ? 'text-slate-400 border-t border-white/10' : 'text-slate-900 border-t border-slate-100 opacity-40 hover:opacity-100'}`}>
            <span className="flex items-center gap-2">
              <span className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-indigo-400' : 'bg-slate-500'}`}></span>
              {wordCount} Words
            </span>
            <span className="flex items-center gap-2">
              <span className={`w-1 h-1 rounded-full ${isDarkMode ? 'bg-indigo-400' : 'bg-slate-500'}`}></span>
              {charCount} Characters
            </span>
          </div>
        </div>

        {/* Interpretation Card */}
        <div className={`backdrop-blur-[100px] rounded-[40px] border flex flex-col overflow-hidden relative transition-all duration-1000 shadow-xl ${isDarkMode ? 'bg-slate-900 border-white/10 shadow-black/40' : 'bg-indigo-50/40 border-indigo-200/50'}`}>
           <div className={`px-8 py-6 border-b flex justify-between items-center transition-colors duration-500 ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-white/40 border-indigo-200/20'}`}>
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`}>Interpretation Result</span>
            <div className="flex gap-2">
              <button 
                onClick={() => handlePlaySpeech(targetText, setIsSpeakingTarget)} 
                disabled={!targetText} 
                className={`p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 text-indigo-400 disabled:opacity-20 disabled:pointer-events-none ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-indigo-500/10'}`} 
                title="Listen"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                </svg>
              </button>
              <button 
                onClick={() => handleCopy(targetText)} 
                disabled={!targetText} 
                className={`p-2.5 rounded-xl transition-all hover:scale-110 active:scale-95 text-indigo-400 disabled:opacity-20 disabled:pointer-events-none ${isDarkMode ? 'hover:bg-white/10' : 'hover:bg-indigo-500/10'}`} 
                title="Copy"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                </svg>
              </button>
            </div>
          </div>
          <div className="flex-1 p-10 overflow-y-auto custom-scrollbar relative">
            <p className={`text-2xl xl:text-3xl leading-relaxed font-bold whitespace-pre-wrap transition-all duration-700 ${
              targetText 
              ? (isDarkMode ? 'text-slate-100' : 'text-slate-900') 
              : 'text-slate-500 opacity-20 italic font-medium'
            }`}>
              {targetText || "Your interpretation will bloom here..."}
            </p>
            {isLoading && (
              <div className={`absolute inset-0 flex items-center justify-center backdrop-blur-[2px] animate-pulse ${isDarkMode ? 'bg-black/20' : 'bg-black/5'}`}>
                <div className="flex gap-1.5">
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '150ms' }}></div>
                  <div className="w-2.5 h-2.5 rounded-full bg-indigo-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
