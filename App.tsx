import React from 'react';
import { TranslatorView } from './views/TranslatorView';

const App: React.FC = () => {
  return (
    <div className="flex flex-col h-full bg-slate-50">
      {/* Navbar */}
      <header className="bg-white border-b border-slate-200 px-6 py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="bg-indigo-600 rounded-xl p-2.5 shadow-md shadow-indigo-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3.055 11H5a2 2 0 012 2v1a2 2 0 002 2 2 2 0 012 2v2.945M8 3.935V5.5A2.5 2.5 0 0010.5 8h.5a2 2 0 012 2 2 2 0 104 0 2 2 0 012-2h1.064M15 20.488V18a2 2 0 012-2h3.064M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-800 tracking-tight leading-none">Bharat Linguist</h1>
            <p className="text-xs text-slate-500 font-semibold mt-0.5">AI Translation Suite</p>
          </div>
        </div>
      </header>

      {/* Content Area */}
      <main className="flex-1 overflow-hidden relative">
        <div className="absolute inset-0 z-10 overflow-y-auto">
          <TranslatorView />
        </div>
      </main>
    </div>
  );
};

export default App;