import React, { useState, useRef, useEffect } from 'react';
import { IndianLanguage } from '../types';
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

  // Calculate stats
  const wordCount = sourceText.trim() === '' ? 0 : sourceText.trim().split(/\s+/).length;
  const charCount = sourceText.length;

  // Auto-focus textarea on mount
  useEffect(() => {
    textAreaRef.current?.focus();
    return () => {
      audioContextRef.current?.close();
    };
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
        mode
      );
      
      setTargetText(result.text);
      
      if (result.detectedSourceLanguage && sourceLang === 'Auto-detect') {
        setDetectedLang(result.detectedSourceLanguage);
      }

    } catch (err) {
      console.error(err);
      setErrorMessage("Unable to complete request. Please check your network or API limits.");
    } finally {
      setIsLoading(false);
    }
  };

  const handlePlaySpeech = async (text: string, setSpeaking: (val: boolean) => void) => {
    if (!text.trim()) return;
    
    setSpeaking(true);
    try {
      if (!audioContextRef.current) {
        audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      }
      
      const base64Audio = await generateSpeech(text);
      if (base64Audio) {
        const audioData = base64ToUint8Array(base64Audio);
        const buffer = await decodeAudioData(audioData, audioContextRef.current, 24000, 1);
        
        const source = audioContextRef.current.createBufferSource();
        source.buffer = buffer;
        source.connect(audioContextRef.current.destination);
        source.onended = () => setSpeaking(false);
        source.start(0);
      } else {
        setSpeaking(false);
      }
    } catch (err) {
      console.error("Failed to play audio", err);
      setSpeaking(false);
      setErrorMessage("Failed to generate speech audio.");
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
        const base64String = reader.result as string;
        const base64Data = base64String.split(',')[1];
        setSelectedImage(base64Data);
        setErrorMessage(null);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSwapLanguages = () => {
    if (sourceLang === 'Auto-detect') {
      if (detectedLang) {
        setSourceLang(targetLang);
        setTargetLang(detectedLang);
        setDetectedLang(null);
      }
    } else {
      const temp = sourceLang;
      setSourceLang(targetLang);
      setTargetLang(temp);
    }
    
    if (targetText) {
      setSourceText(targetText);
      setTargetText(sourceText); 
    }
  };

  const handleCopy = (text: string) => {
    if (text) {
      navigator.clipboard.writeText(text);
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

  return (
    <div className="flex flex-col h-full max-w-7xl mx-auto p-4 lg:p-10 gap-8 lg:gap-10">
      
      {/* 1. Mode Selection */}
      <div className="flex justify-center">
         <div className={`backdrop-blur-xl p-1.5 rounded-full inline-flex items-center gap-1 shadow-2xl border ring-1 transition-all duration-500 ${isDarkMode ? 'bg-slate-900/60 border-white/5 ring-white/5' : 'bg-white/60 border-white/40 ring-slate-900/5'}`}>
            <button
                onClick={() => setMode('translate')}
                className={`px-10 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ease-out ${mode === 'translate' ? (isDarkMode ? 'bg-white text-slate-950 shadow-white/10' : 'bg-slate-900 text-white shadow-slate-900/20') : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50')} scale-100 active:scale-95`}
            >
                Translation
            </button>
            <button
                onClick={() => setMode('transliterate')}
                className={`px-10 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ease-out ${mode === 'transliterate' ? (isDarkMode ? 'bg-white text-slate-950 shadow-white/10' : 'bg-slate-900 text-white shadow-slate-900/20') : (isDarkMode ? 'text-slate-400 hover:text-white hover:bg-white/5' : 'text-slate-500 hover:text-slate-800 hover:bg-white/50')} scale-100 active:scale-95`}
            >
                Transliteration
            </button>
         </div>
      </div>

      {/* 2. Control Panel */}
      <div className={`backdrop-blur-2xl p-6 lg:p-7 rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.1)] border flex flex-col md:flex-row gap-6 items-center justify-between z-20 relative transition-all duration-500 ${isDarkMode ? 'bg-slate-900/70 border-white/5' : 'bg-white/70 border-white/50'}`}>
         
         <div className="flex flex-col sm:flex-row gap-5 items-center w-full md:w-auto flex-1">
            <div className="w-full sm:w-64">
              <LanguageSelect 
                label={mode === 'transliterate' ? "From Script" : "Translate from"}
                value={sourceLang} 
                onChange={setSourceLang}
                includeAutoDetect={true}
                includeEnglish={true}
                isDarkMode={isDarkMode}
              />
            </div>
            
            <div className="pt-5 shrink-0">
                <button 
                  onClick={handleSwapLanguages}
                  className={`p-3.5 rounded-full transition-all duration-300 border shadow-sm hover:shadow-md group ${isDarkMode ? 'text-slate-400 hover:text-indigo-400 hover:bg-white/5 border-white/5' : 'text-slate-400 hover:text-indigo-600 hover:bg-white border-slate-100/50'}`}
                  title="Swap Languages"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-180 transition-transform duration-700 ease-spring" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
            </div>

            <div className="w-full sm:w-64">
              <LanguageSelect 
                label={mode === 'transliterate' ? "To Script" : "Translate to"}
                value={targetLang} 
                onChange={setTargetLang} 
                isDarkMode={isDarkMode}
              />
            </div>
         </div>
         
         <div className="w-full md:w-auto pt-4 md:pt-0 flex items-center gap-4 justify-end">
             {hasContent && (
               <button 
                  onClick={clearAll}
                  className={`px-5 py-3.5 text-sm font-bold rounded-2xl transition-all duration-200 ${isDarkMode ? 'text-slate-500 hover:text-red-400 hover:bg-red-950/20' : 'text-slate-400 hover:text-red-500 hover:bg-red-50/50'}`}
               >
                  Clear
               </button>
             )}
             <button 
                onClick={handleTranslate}
                disabled={isLoading || !hasContent}
                className={`flex-1 md:flex-none w-full md:w-auto px-10 py-4 rounded-2xl font-bold text-white shadow-lg transition-all transform active:scale-[0.97] flex items-center justify-center gap-3 border border-transparent
                ${isLoading || !hasContent
                    ? (isDarkMode ? 'bg-slate-800 text-slate-500' : 'bg-slate-200 text-slate-400 shadow-none border-slate-100 cursor-not-allowed') 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-600/30 hover:-translate-y-1'}`}
             >
                {isLoading ? (
                    <svg className="animate-spin h-5 w-5 text-white/90" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <span className="tracking-wide text-base">{mode === 'transliterate' ? 'Transliterate' : 'Translate Now'}</span>
                )}
             </button>
         </div>
      </div>

      {/* 3. Translation Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 min-h-[500px] mb-8">
        
        {/* Input Card */}
        <div className={`backdrop-blur-xl rounded-[32px] border flex flex-col overflow-hidden focus-within:ring-4 transition-all duration-500 relative group hover:shadow-2xl ${isDarkMode ? 'bg-slate-900/60 shadow-black/20 border-white/5 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/40' : 'bg-white rounded-[32px] shadow-[0_8px_30px_rgba(0,0,0,0.03)] border-white/60 focus-within:ring-indigo-500/10 focus-within:border-indigo-500/30'}`}>
          
          <div className={`px-7 py-5 border-b flex justify-between items-center transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white/40 border-slate-50/50'}`}>
            <div className="flex gap-4 items-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase tracking-[0.2em]">Source Input</span>
              {detectedLang && (
                <span className={`text-[10px] px-3 py-1 rounded-full border uppercase tracking-widest font-bold animate-in fade-in zoom-in duration-500 ${isDarkMode ? 'bg-white/10 text-indigo-300 border-white/5' : 'bg-slate-900/5 text-slate-600 border-slate-200/50'}`}>
                  {detectedLang}
                </span>
              )}
            </div>
            <div className="flex gap-1.5 items-center">
               <button 
                onClick={() => handlePlaySpeech(sourceText, setIsSpeakingSource)}
                disabled={!sourceText || isSpeakingSource}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white/10 rounded-xl transition-all duration-300 disabled:opacity-10 hover:scale-110"
                title="Listen"
              >
                {isSpeakingSource ? (
                    <svg className="animate-spin h-5 w-5 text-indigo-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                )}
              </button>
               <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2.5 text-slate-500 hover:text-indigo-600 hover:bg-white/10 rounded-xl transition-all duration-300 group/btn relative hover:scale-110"
                title="Upload Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <input type="file" accept="image/*" className="hidden" ref={fileInputRef} onChange={handleImageUpload} />
          </div>
          
          <div className="flex-1 relative p-8 flex flex-col">
            {selectedImage && (
              <div className="mb-8 relative group/img inline-block self-start">
                 <img src={`data:image/jpeg;base64,${selectedImage}`} className={`h-40 rounded-2xl shadow-2xl border-4 object-cover relative z-10 ${isDarkMode ? 'border-slate-800' : 'border-white'}`} />
                 <button onClick={() => setSelectedImage(null)} className={`absolute -top-3 -right-3 shadow-xl p-2 rounded-full transition-all duration-200 z-20 scale-90 hover:scale-110 ${isDarkMode ? 'bg-slate-800 text-slate-400 border-white/5 hover:bg-red-500' : 'bg-white text-slate-400 border border-slate-200 hover:bg-red-500'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                 </button>
              </div>
            )}
            <textarea
              ref={textAreaRef}
              className={`w-full h-full resize-none outline-none text-2xl bg-transparent leading-relaxed custom-scrollbar font-semibold transition-colors duration-500 ${isDarkMode ? 'text-white placeholder-slate-700' : 'text-slate-800 placeholder-slate-200'}`}
              placeholder={selectedImage ? "Add context..." : "Type to translate..."}
              value={sourceText}
              onChange={(e) => setSourceText(e.target.value)}
              spellCheck="false"
            />
             <div className={`absolute bottom-7 right-8 text-[10px] font-bold uppercase tracking-widest pointer-events-none flex gap-4 select-none opacity-60 transition-colors duration-500 ${isDarkMode ? 'text-slate-600' : 'text-slate-300'}`}>
               <span>{wordCount} Words</span>
               <span className="opacity-20">|</span>
               <span>{charCount} Chars</span>
            </div>
          </div>
        </div>

        {/* Output Card */}
        <div className={`backdrop-blur-2xl rounded-[32px] border flex flex-col overflow-hidden relative group transition-all duration-700 hover:shadow-2xl ${isDarkMode ? 'bg-indigo-950/20 border-white/5 hover:bg-indigo-950/30' : 'bg-indigo-950/5 border-white/50 hover:bg-indigo-950/10'}`}>
           <div className={`px-7 py-5 border-b flex justify-between items-center transition-all duration-500 ${isDarkMode ? 'bg-white/5 border-white/5' : 'bg-white/10 border-white/20'}`}>
            <span className="text-[11px] font-bold text-indigo-600 uppercase tracking-[0.2em]">Translated Result</span>
            <div className="flex gap-2.5">
                <button 
                    onClick={() => handlePlaySpeech(targetText, setIsSpeakingTarget)}
                    disabled={!targetText || isSpeakingTarget}
                    className="p-2.5 text-indigo-500 hover:text-indigo-300 hover:bg-white/5 rounded-xl transition-all duration-300 disabled:opacity-0 hover:scale-110 shadow-sm"
                    title="Listen"
                >
                    {isSpeakingTarget ? (
                        <svg className="animate-spin h-5 w-5 text-indigo-400" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                    ) : (
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                        </svg>
                    )}
                </button>
                <button 
                    onClick={() => handleCopy(targetText)}
                    disabled={!targetText}
                    className="p-2.5 text-indigo-500 hover:text-indigo-300 hover:bg-white/5 rounded-xl transition-all duration-300 disabled:opacity-0 hover:scale-110 shadow-sm"
                    title="Copy"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
          </div>
          
          <div className="flex-1 p-8 overflow-y-auto custom-scrollbar relative">
            {targetText ? (
              <p className={`text-2xl leading-relaxed font-semibold whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-4 duration-700 transition-colors duration-500 ${isDarkMode ? 'text-slate-100' : 'text-slate-900'}`}>{targetText}</p>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-6 select-none pointer-events-none opacity-40">
                <div className={`p-6 rounded-[24px] shadow-sm border group-hover:scale-110 transition-all duration-700 ${isDarkMode ? 'bg-white/5 border-white/5 group-hover:bg-white/10' : 'bg-white/50 border-white/50 group-hover:bg-white/80'}`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-indigo-200" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                </div>
                <div className="text-center">
                    <span className="text-[10px] font-black uppercase tracking-[0.3em] text-indigo-400 block mb-1">Awaiting Content</span>
                    <span className={`text-xs transition-colors duration-500 ${isDarkMode ? 'text-slate-500' : 'text-indigo-200'}`}>Translation logic ready</span>
                </div>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};