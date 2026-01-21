import React, { useState, useEffect, useRef } from 'react';
import { IndianLanguage } from '../types';
import { LanguageSelect } from '../components/LanguageSelect';
import { LiveSessionManager } from '../services/geminiService';
import { AudioVisualizer } from '../components/AudioVisualizer';

export const LiveInterpreterView: React.FC = () => {
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
      setStatus('Listening... (Speak English or ' + targetLang + ')');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full max-w-2xl mx-auto p-6 gap-8 text-center">
      
      <div className="space-y-2">
        <h2 className="text-3xl font-bold text-slate-800">Live Interpreter</h2>
        <p className="text-slate-500">
          Real-time bidirectional voice translation. Just speak naturally.
        </p>
      </div>

      <div className="w-full max-w-xs mx-auto">
        <LanguageSelect 
          label="Counterpart Language"
          value={targetLang} 
          onChange={setTargetLang} 
        />
      </div>

      {/* Visualizers */}
      <div className="w-full space-y-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
          <span className="absolute top-2 left-3 text-xs font-bold text-indigo-500 uppercase z-10">AI Voice</span>
          <AudioVisualizer analyser={outputAnalyser} isActive={isActive} color="#4f46e5" />
        </div>
        
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden">
             <span className="absolute top-2 left-3 text-xs font-bold text-teal-500 uppercase z-10">Your Voice</span>
          <AudioVisualizer analyser={inputAnalyser} isActive={isActive} color="#0d9488" />
        </div>
      </div>

      {/* Main Control */}
      <div className="flex flex-col items-center gap-4">
        <button
          onClick={toggleSession}
          className={`relative group rounded-full w-24 h-24 flex items-center justify-center transition-all duration-300 shadow-lg
            ${isActive 
              ? 'bg-red-500 hover:bg-red-600 shadow-red-200' 
              : 'bg-indigo-600 hover:bg-indigo-700 shadow-indigo-200'}`}
        >
          {isActive ? (
             <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white pl-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
            </svg>
          )}
          
          {/* Pulsing effect when active */}
          {isActive && (
            <span className="absolute -inset-2 rounded-full bg-red-500 opacity-30 animate-ping"></span>
          )}
        </button>

        <p className={`font-medium transition-colors ${isActive ? 'text-red-600 animate-pulse' : 'text-slate-500'}`}>
          {status}
        </p>
      </div>

      <div className="bg-blue-50 text-blue-800 text-sm p-4 rounded-lg max-w-md">
        <strong>Note:</strong> Ensure you are using a paid API Key for Gemini Live Audio features. Standard keys may have rate limits or restrictions on audio streaming.
      </div>
    </div>
  );
};
