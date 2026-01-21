import React, { useState, useRef, useEffect } from 'react';
import { IndianLanguage } from '../types';
import { LanguageSelect } from '../components/LanguageSelect';
import { translateContent } from '../services/geminiService';

export const TranslatorView: React.FC = () => {
  const [sourceText, setSourceText] = useState('');
  const [targetText, setTargetText] = useState('');
  
  const [sourceLang, setSourceLang] = useState<string>('Auto-detect');
  const [targetLang, setTargetLang] = useState<string>(IndianLanguage.Hindi);
  const [detectedLang, setDetectedLang] = useState<string | null>(null);

  const [mode, setMode] = useState<'translate' | 'transliterate'>('translate');

  const [isLoading, setIsLoading] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const textAreaRef = useRef<HTMLTextAreaElement>(null);

  const hasContent = sourceText.trim().length > 0 || selectedImage !== null;

  // Calculate stats
  const wordCount = sourceText.trim() === '' ? 0 : sourceText.trim().split(/\s+/).length;
  const charCount = sourceText.length;

  // Auto-focus textarea on mount
  useEffect(() => {
    textAreaRef.current?.focus();
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
    <div className="flex flex-col h-full max-w-7xl mx-auto p-4 lg:p-8 gap-6 lg:gap-8">
      
      {/* 1. Mode Selection */}
      <div className="flex justify-center">
         <div className="bg-white/80 backdrop-blur-md p-1.5 rounded-full inline-flex items-center gap-1 shadow-sm border border-slate-200/60 ring-4 ring-slate-50/50">
            <button
                onClick={() => setMode('translate')}
                className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ease-out ${mode === 'translate' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 scale-95'}`}
            >
                Translation
            </button>
            <button
                onClick={() => setMode('transliterate')}
                className={`px-8 py-2.5 rounded-full text-sm font-bold transition-all duration-300 ease-out ${mode === 'transliterate' ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/20 scale-100' : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/80 scale-95'}`}
            >
                Transliteration
            </button>
         </div>
      </div>

      {/* 2. Control Panel */}
      <div className="bg-white/80 backdrop-blur-xl p-5 lg:p-6 rounded-[24px] shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/40 ring-1 ring-slate-900/5 flex flex-col md:flex-row gap-6 items-center justify-between z-20 relative transition-transform duration-500">
         
         {/* Language Controls Group */}
         <div className="flex flex-col sm:flex-row gap-4 items-center w-full md:w-auto flex-1">
            <div className="w-full sm:w-64">
              <LanguageSelect 
                label={mode === 'transliterate' ? "From Script" : "Translate from"}
                value={sourceLang} 
                onChange={setSourceLang}
                includeAutoDetect={true}
                includeEnglish={true}
              />
            </div>
            
            <div className="pt-5">
                <button 
                  onClick={handleSwapLanguages}
                  className="p-3 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-full transition-all duration-300 border border-transparent hover:border-indigo-100 group"
                  title="Swap Languages"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 group-hover:rotate-180 transition-transform duration-500 ease-spring" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                  </svg>
                </button>
            </div>

            <div className="w-full sm:w-64">
              <LanguageSelect 
                label={mode === 'transliterate' ? "To Script" : "Translate to"}
                value={targetLang} 
                onChange={setTargetLang} 
              />
            </div>
         </div>
         
         {/* Actions Group */}
         <div className="w-full md:w-auto pt-4 md:pt-0 flex items-center gap-4 justify-end">
             {hasContent && (
               <button 
                  onClick={clearAll}
                  className="px-4 py-3 text-sm font-semibold text-slate-500 hover:text-red-600 hover:bg-red-50/50 rounded-xl transition-colors duration-200"
               >
                  Clear
               </button>
             )}
             <button 
                onClick={handleTranslate}
                disabled={isLoading || !hasContent}
                className={`flex-1 md:flex-none w-full md:w-auto px-8 py-3.5 rounded-xl font-bold text-white shadow-lg transition-all transform active:scale-[0.98] flex items-center justify-center gap-2.5 border border-transparent
                ${isLoading || !hasContent
                    ? 'bg-slate-100 text-slate-400 shadow-none border-slate-200 cursor-not-allowed' 
                    : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-500/30 hover:shadow-indigo-500/40 hover:-translate-y-0.5'}`}
             >
                {isLoading ? (
                    <>
                        <svg className="animate-spin h-4 w-4 text-white/90" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span className="tracking-wide text-sm">Translating...</span>
                    </>
                ) : (
                    <>
                        <span className="tracking-wide text-sm">{mode === 'transliterate' ? 'Transliterate' : 'Translate'}</span>
                    </>
                )}
             </button>
         </div>
      </div>

      {/* Error Banner */}
      {errorMessage && (
        <div className="bg-red-50 border border-red-100 text-red-700 px-6 py-4 rounded-2xl flex items-start gap-4 shadow-sm animate-in fade-in slide-in-from-top-4 duration-300">
          <div className="bg-white p-2 rounded-full shadow-sm shrink-0">
             <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
             </svg>
          </div>
          <div className="flex-1 pt-0.5">
             <h3 className="font-bold text-sm text-red-900">Action Failed</h3>
             <p className="text-sm mt-1 text-red-800/80 leading-relaxed">{errorMessage}</p>
          </div>
          <button onClick={() => setErrorMessage(null)} className="text-red-400 hover:text-red-700 transition-colors p-1.5 hover:bg-red-100 rounded-lg">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
               <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        </div>
      )}

      {/* 3. Translation Workspace */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-2 gap-6 lg:gap-8 min-h-[500px]">
        
        {/* Input Card */}
        <div className="bg-white rounded-[24px] shadow-sm border border-slate-200/60 flex flex-col overflow-hidden focus-within:ring-2 focus-within:ring-indigo-500/20 focus-within:border-indigo-500/40 transition-all duration-300 relative group hover:shadow-md">
          
          {/* Card Header */}
          <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-white">
            <div className="flex gap-4 items-center">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-widest">Source Text</span>
              {detectedLang && (
                <span className="text-[10px] bg-slate-100 text-slate-600 px-2.5 py-1 rounded-md border border-slate-200 uppercase tracking-wider font-bold animate-in fade-in zoom-in duration-300">
                  {detectedLang}
                </span>
              )}
            </div>
            <div className="flex gap-1 items-center">
               <button 
                onClick={() => fileInputRef.current?.click()}
                className="p-2 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50/50 rounded-xl transition-all duration-200 group/btn relative hover:scale-105"
                title="Upload Image"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              </button>
            </div>
            <input 
              type="file" 
              accept="image/*" 
              className="hidden" 
              ref={fileInputRef}
              onChange={handleImageUpload}
            />
          </div>
          
          <div className="flex-1 relative p-6 flex flex-col">
            {selectedImage && (
              <div className="mb-6 relative group/img inline-block self-start">
                 <img 
                  src={`data:image/jpeg;base64,${selectedImage}`} 
                  alt="Upload preview" 
                  className="h-32 rounded-xl shadow-lg shadow-slate-200/50 border border-slate-200 object-cover"
                />
                <button 
                  onClick={() => setSelectedImage(null)}
                  className="absolute -top-2.5 -right-2.5 bg-white text-slate-400 border border-slate-200 shadow-sm p-1 rounded-full hover:text-white hover:bg-red-500 hover:border-red-500 transition-all duration-200"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
            )}
            <textarea
              ref={textAreaRef}
              className="w-full h-full resize-none outline-none text-slate-700 text-xl placeholder-slate-300 bg-transparent leading-relaxed custom-scrollbar font-medium"
              placeholder={selectedImage ? "Add context to the image (optional)..." : (mode === 'transliterate' ? "Start typing to transliterate..." : "Enter text to translate...")}
              value={sourceText}
              onChange={(e) => {
                  setSourceText(e.target.value);
                  if (errorMessage) setErrorMessage(null);
              }}
              spellCheck="false"
            />
             <div className="absolute bottom-5 right-6 text-[10px] font-bold uppercase tracking-widest text-slate-300 pointer-events-none flex gap-3 select-none">
               <span>{wordCount} Words</span>
               <span className="text-slate-200">|</span>
               <span>{charCount} Chars</span>
            </div>
          </div>
        </div>

        {/* Output Card */}
        <div className="bg-indigo-50/30 rounded-[24px] border border-slate-200/60 flex flex-col overflow-hidden relative group hover:bg-indigo-50/50 transition-colors duration-500">
           
           <div className="px-6 py-4 border-b border-slate-200/50 flex justify-between items-center bg-transparent">
            <span className="text-[11px] font-bold text-indigo-500 uppercase tracking-widest">Translation</span>
            <div className="flex gap-2">
                <button 
                    onClick={() => handleCopy(targetText)}
                    disabled={!targetText}
                    className="p-2 text-indigo-300 hover:text-indigo-600 hover:bg-white rounded-xl transition-all duration-200 disabled:opacity-0 hover:shadow-sm"
                    title="Copy Text"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                </button>
            </div>
          </div>
          
          <div className="flex-1 p-6 overflow-y-auto custom-scrollbar relative">
            {targetText ? (
              <p className="text-xl text-slate-800 leading-relaxed font-medium whitespace-pre-wrap animate-in fade-in slide-in-from-bottom-2 duration-500">{targetText}</p>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-slate-400 gap-4 select-none pointer-events-none opacity-50">
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-100/50 group-hover:scale-110 transition-transform duration-500">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-indigo-100" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5h12M9 3v2m1.048 9.5A18.022 18.022 0 016.412 9m6.088 9h7M11 21l5-10 5 10M12.751 5C11.783 10.77 8.07 15.61 3 18.129" />
                    </svg>
                </div>
                <span className="text-xs font-bold uppercase tracking-widest text-indigo-200">Translation Area</span>
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
};