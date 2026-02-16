
import React from 'react';
import { IndianLanguage } from '../types';

interface Props {
  value: string;
  onChange: (value: string) => void;
  includeEnglish?: boolean;
  includeAutoDetect?: boolean;
  label: string;
  isDarkMode: boolean;
}

export const LanguageSelect: React.FC<Props> = ({ 
  value, 
  onChange, 
  includeEnglish = false, 
  includeAutoDetect = false,
  label,
  isDarkMode
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className={`text-[11px] font-black uppercase tracking-widest pl-1 transition-colors duration-500 ${isDarkMode ? 'text-indigo-400' : 'text-slate-400'}`}>{label}</label>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className={`appearance-none w-full border px-4 py-4 pr-10 rounded-2xl shadow-sm focus:outline-none focus:ring-4 transition-all cursor-pointer text-sm font-bold duration-500 ${
            isDarkMode 
              ? 'bg-slate-800 border-white/10 hover:border-indigo-400 focus:ring-indigo-500/20 focus:border-indigo-400 text-white' 
              : 'bg-white border-slate-200 hover:border-indigo-400 focus:ring-indigo-500/10 focus:border-indigo-500 text-slate-800'
          }`}
        >
          {includeAutoDetect && <option className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white'} value="Auto-detect">✨ Auto-detect</option>}
          {includeEnglish && <option className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white'} value="English">English</option>}
          {Object.values(IndianLanguage).map((lang) => (
            <option className={isDarkMode ? 'bg-slate-900 text-white' : 'bg-white'} key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <div className={`pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 transition-colors duration-300 ${isDarkMode ? 'text-indigo-400 group-hover:text-white' : 'text-slate-400 group-hover:text-indigo-600'}`}>
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
};
