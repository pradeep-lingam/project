import React, { useState, useEffect, useRef } from 'react';
import { IndianLanguage } from '../types';
import { LanguageSelect } from '../components/LanguageSelect';
import { LiveSessionManager } from '../services/geminiService';
import { AudioVisualizer } from '../components/AudioVisualizer';

interface LiveInterpreterViewProps {
  isDarkMode: boolean;
}

export const LiveInterpreterView: React.FC<LiveInterpreterViewProps> = ({ isDarkMode }) => {
  const [isActive, setIsActive] = useState(false);
  const [targetLang, setTargetLang] = useState<string>(IndianLanguage.Hindi);
  const [status, setStatus] = useState<string>('Ready to start');
  
  const liveSessionRef = useRef<LiveSessionManager>(new LiveSessionManager());
  
  // Analyser nodes for visualization
  const [inputAnalyser, setInputAnalyser] = useState<AnalyserNode | null>(null);
  const [outputAnalyser, setOutputAnalyser] = useState<AnalyserNode | null>(null);

  useEffect(() => {
    // Cleanup on unmount
    return () => {
      liveSessionRef.current.disconnect();
    };
  }, []);

  const toggleSession = async () => {
    if (isActive) {
      liveSessionRef.current.disconnect();
      setIsActive(false);
      setStatus('Session ended');
      setInputAnalyser(null);
      setOutputAnalyser(null);
    } else {
      setStatus('Connecting...');
      
      liveSessionRef.current.onInputAudio = (analyser) => setInputAnalyser(analyser);
      liveSessionRef.current.onOutputAudio = (analyser) => setOutputAnalyser(analyser);
      liveSessionRef.current.onError = (err) => {
        setStatus(`Error: ${err}`);
        setIsActive(false);
      };

      await liveSessionRef.current.connect(targetLang);
      
      setIsActive(true);
      setStatus('Listening... Speak now');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[calc(100vh-100px)] max-w-2xl mx-auto p-6 gap-10 text-center animate-in fade-in duration-500">
      
      <div className="space-y-3">
        <h2 className={`text-4xl font-black tracking-tight transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-slate-900'}`}>
          Live Interpreter
        </h2>
        <p className={`text-sm font-medium transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>
          Real-time bidirectional voice translation. Just speak naturally.
        </p>
      </div>

      <div className="w-full max-w-sm mx-auto">
        <LanguageSelect 
          label="Counterpart Language"
          value={targetLang} 
          onChange={setTargetLang}
          isDarkMode={isDarkMode}
        />
      </div>

      {/* Visualizers */}
      <div className="w-full space-y-6">
        <div className={`p-1 rounded-[24px] border transition-all duration-500 shadow-xl overflow-hidden relative group ${isDarkMode ? 'bg-indigo-950/20 border-white/5' : 'bg-white/60 border-slate-200'}`}>
          <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
             <div className="w-1.5 h-1.5 rounded-full bg-indigo-500 animate-pulse"></div>
             <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">AI Output</span>
          </div>
          <AudioVisualizer analyser={outputAnalyser} isActive={isActive} color="#6366f1" />
        </div>
        
        <div className={`p-1 rounded-[24px] border transition-all duration-500 shadow-xl overflow-hidden relative group ${isDarkMode ? 'bg-emerald-950/10 border-white/5' : 'bg-white/60 border-slate-200'}`}>
          <div className="absolute top-3 left-4 flex items-center gap-2 z-10">
             <div className={`w-1.5 h-1.5 rounded-full ${isActive ? 'bg-emerald-500' : 'bg-slate-300'} transition-colors`}></div>
             <span className="text-[10px] font-black text-emerald-500 uppercase tracking-widest">Your Voice</span>
          </div>
          <AudioVisualizer analyser={inputAnalyser} isActive={isActive} color="#10b981" />
        </div>
      </div>

      {/* Main Control */}
      <div className="flex flex-col items-center gap-6">
        <button
          onClick={toggleSession}
          className={`relative group rounded-full w-28 h-28 flex items-center justify-center transition-all duration-500 shadow-2xl transform active:scale-95
            ${isActive 
              ? 'bg-red-500 hover:bg-red-600 shadow-red-500/30' 
              : (isDarkMode ? 'bg-indigo-600 hover:bg-indigo-500 shadow-indigo-600/30' : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200')}`}
        >
          {isActive ? (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-white pl-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
          
          {/* Pulsing effect when active */}
          {isActive && (
            <span className="absolute -inset-4 rounded-full bg-red-500/20 animate-ping pointer-events-none"></span>
          )}
        </button>

        <p className={`text-lg font-bold tracking-tight transition-all duration-500 ${isActive ? 'text-red-500 animate-pulse' : (isDarkMode ? 'text-slate-500' : 'text-slate-400')}`}>
          {status}
        </p>
      </div>

      <div className={`text-xs p-5 rounded-2xl max-w-md transition-all duration-500 border backdrop-blur-sm leading-relaxed ${isDarkMode ? 'bg-blue-950/20 text-blue-300 border-blue-500/10' : 'bg-blue-50 text-blue-700 border-blue-100'}`}>
        <strong className="block mb-1 text-[10px] uppercase tracking-widest">Developer Note</strong>
        Real-time interpretation requires a paid Gemini API Tier for optimized performance and low-latency audio streams.
      </div>
    </div>
  );
};