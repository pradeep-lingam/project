
import React, { useState, useRef, useEffect } from 'react';
import { IndianLanguage } from '../types';
import { LanguageSelect } from '../components/LanguageSelect';
import { AudioVisualizer } from '../components/AudioVisualizer';
import { LiveSessionManager } from '../services/geminiService';

interface LiveInterpreterViewProps {
  isDarkMode: boolean;
}

export const LiveInterpreterView: React.FC<LiveInterpreterViewProps> = ({ isDarkMode }) => {
  const [isLive, setIsLive] = useState(false);
  const [targetLang, setTargetLang] = useState<string>(IndianLanguage.Hindi);
  const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | null>(null);
  const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);
  const [error, setError] = useState<string | null>(null);
  
  const liveSessionRef = useRef<LiveSessionManager>(new LiveSessionManager());

  useEffect(() => {
    const session = liveSessionRef.current;
    session.onInputAudio = (analyser) => setInputAnalyser(analyser);
    session.onOutputAudio = (analyser) => setOutputAnalyser(analyser);
    session.onError = (err) => {
      setError(err);
      setIsLive(false);
    };

    return () => {
      session.disconnect();
    };
  }, []);

  const toggleLive = async () => {
    if (isLive) {
      liveSessionRef.current.disconnect();
      setIsLive(false);
      setInputAnalyser(null);
      setOutputAnalyser(null);
    } else {
      setError(null);
      try {
        await liveSessionRef.current.connect(targetLang);
        setIsLive(true);
      } catch (err: any) {
        setError(err.message || "Failed to start live session.");
        setIsLive(false);
      }
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-6 py-12 space-y-8">
      <div className="text-center space-y-4">
        <h2 className={`text-4xl font-black tracking-tighter ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          LIVE INTERPRETER
        </h2>
        <p className={`text-sm font-medium max-w-lg mx-auto ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Real-time, two-way audio translation. Perfect for natural conversations between English and Indian languages.
        </p>
      </div>

      <div className={`backdrop-blur-xl rounded-[40px] border p-8 space-y-8 transition-all duration-700 ${
        isDarkMode ? 'bg-slate-900/50 border-white/10 shadow-2xl shadow-black/50' : 'bg-white border-slate-200 shadow-xl shadow-indigo-100'
      }`}>
        
        <div className="flex flex-col md:flex-row items-center justify-center gap-6">
          <div className="flex items-center gap-4">
            <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>English</span>
            <div className={`w-8 h-[1px] ${isDarkMode ? 'bg-white/10' : 'bg-slate-200'}`}></div>
            <LanguageSelect 
              value={targetLang} 
              onChange={setTargetLang} 
              isDarkMode={isDarkMode} 
              excludeAutoDetect
            />
          </div>

          <button
            onClick={toggleLive}
            className={`group relative px-10 py-5 rounded-full font-black text-xs uppercase tracking-[0.3em] transition-all transform active:scale-95 overflow-hidden ${
              isLive 
              ? 'bg-red-500 text-white shadow-red-500/20' 
              : 'bg-indigo-600 text-white shadow-indigo-500/20 hover:shadow-indigo-500/40 hover:-translate-y-1'
            }`}
          >
            <div className="relative z-10 flex items-center gap-3">
              {isLive ? (
                <>
                  <div className="w-2 h-2 rounded-full bg-white animate-pulse"></div>
                  <span>Stop Session</span>
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                  </svg>
                  <span>Start Live Mode</span>
                </>
              )}
            </div>
            {!isLive && (
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent -translate-x-full group-hover:animate-shimmer"></div>
            )}
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-2xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs font-bold text-center uppercase tracking-widest animate-shake">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {/* User Input Visualizer */}
          <div className={`rounded-3xl p-6 space-y-4 border transition-all duration-500 ${
            isLive ? (isDarkMode ? 'bg-white/5 border-indigo-500/30' : 'bg-indigo-50 border-indigo-200') : (isDarkMode ? 'bg-black/20 border-white/5 opacity-40' : 'bg-slate-50 border-slate-100 opacity-40')
          }`}>
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-indigo-400' : 'text-indigo-500'}`}>Your Voice</span>
              {isLive && <span className="flex h-2 w-2 rounded-full bg-indigo-500 animate-ping"></span>}
            </div>
            <div className="h-24 flex items-center justify-center">
              <AudioVisualizer analyser={inputAnalyser} isDarkMode={isDarkMode} isActive={isLive} />
            </div>
          </div>

          {/* AI Output Visualizer */}
          <div className={`rounded-3xl p-6 space-y-4 border transition-all duration-500 ${
            isLive ? (isDarkMode ? 'bg-white/5 border-purple-500/30' : 'bg-purple-50 border-purple-200') : (isDarkMode ? 'bg-black/20 border-white/5 opacity-40' : 'bg-slate-50 border-slate-100 opacity-40')
          }`}>
            <div className="flex justify-between items-center">
              <span className={`text-[10px] font-black uppercase tracking-widest ${isDarkMode ? 'text-purple-400' : 'text-purple-500'}`}>AI Interpretation</span>
              {isLive && <span className="flex h-2 w-2 rounded-full bg-purple-500 animate-ping"></span>}
            </div>
            <div className="h-24 flex items-center justify-center">
              <AudioVisualizer analyser={outputAnalyser} isDarkMode={isDarkMode} isActive={isLive} />
            </div>
          </div>
        </div>

        <div className={`p-6 rounded-3xl text-center space-y-2 border ${isDarkMode ? 'bg-white/5 border-white/10' : 'bg-slate-50 border-slate-200'}`}>
          <p className={`text-[10px] font-black uppercase tracking-[0.2em] ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
            How it works
          </p>
          <p className={`text-xs leading-relaxed ${isDarkMode ? 'text-slate-500' : 'text-slate-600'}`}>
            Speak naturally. The AI detects the language and interprets it into the other language instantly. 
            Both people can hear the translation through the speakers.
          </p>
        </div>
      </div>
    </div>
  );
};
