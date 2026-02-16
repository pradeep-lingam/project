
import React, { useState } from 'react';
import { TranslatorView } from './views/TranslatorView';

const App: React.FC = () => {
  const [isDarkMode, setIsDarkMode] = useState(true);

  return (
    <div className={`flex flex-col h-full relative overflow-hidden transition-colors duration-500 ${isDarkMode ? 'bg-slate-950 text-white' : 'bg-slate-50 text-slate-900'}`}>
      
      {/* Decorative Background Elements */}
      <div className={`absolute top-[-10%] left-[-5%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none animate-float transition-all duration-700 ${isDarkMode ? 'bg-indigo-900/20' : 'bg-indigo-200/40'}`}></div>
      <div className={`absolute bottom-[-10%] right-[-5%] w-[40%] h-[40%] rounded-full blur-[120px] pointer-events-none animate-float transition-all duration-700 ${isDarkMode ? 'bg-purple-900/10' : 'bg-rose-100/40'}`} style={{ animationDelay: '-5s' }}></div>
      <div className={`absolute top-[20%] right-[10%] w-[30%] h-[30%] rounded-full blur-[100px] pointer-events-none animate-float transition-all duration-700 ${isDarkMode ? 'bg-emerald-900/10' : 'bg-teal-100/30'}`} style={{ animationDelay: '-10s' }}></div>

      {/* Navbar */}
      <header className={`px-6 py-4 flex items-center justify-between shrink-0 z-30 transition-all duration-500 border-b backdrop-blur-md ${isDarkMode ? 'bg-slate-900/60 border-white/5' : 'bg-white/70 border-slate-200/60'}`}>
        <div className="flex items-center gap-3">
          <div className={`rounded-xl p-2.5 shadow-lg transition-all duration-500 ${isDarkMode ? 'bg-indigo-500 shadow-indigo-500/20' : 'bg-indigo-600 shadow-indigo-200'}`}>
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className={`text-xl font-bold tracking-tight leading-none transition-colors duration-500 ${isDarkMode ? 'text-white' : 'text-slate-800'}`}>Bharat languages</h1>
            <p className={`text-[10px] font-bold uppercase tracking-widest mt-1 opacity-70 transition-colors duration-500 ${isDarkMode ? 'text-slate-400' : 'text-slate-500'}`}>AI Multilingual Engine</p>
          </div>
        </div>

        {/* Theme Toggle Button */}
        <button 
          onClick={() => setIsDarkMode(!isDarkMode)}
          className={`p-2.5 rounded-xl transition-all duration-300 border flex items-center gap-2 group ${isDarkMode ? 'bg-slate-800 border-white/10 text-yellow-400 hover:bg-slate-700' : 'bg-white border-slate-200 text-indigo-600 hover:bg-slate-50'}`}
          title={isDarkMode ? "Switch to Light Mode" : "Switch to Dark Mode"}
        >
          {isDarkMode ? (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364l-.707.707M6.343 17.657l-.707.707M16.243 16.243l.707.707M7.757 7.757l.707.707M12 7a5 5 0 100 10 5 5 0 000-10z" />
            </svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative z-20">
        <div className="absolute inset-0 overflow-y-auto custom-scrollbar">
          <TranslatorView isDarkMode={isDarkMode} />
        </div>
      </main>
    </div>
  );
};

export default App;
