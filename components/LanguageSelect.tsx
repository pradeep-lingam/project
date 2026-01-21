import React from 'react';
import { IndianLanguage } from '../types';

interface Props {
  value: string;
  onChange: (value: string) => void;
  includeEnglish?: boolean;
  includeAutoDetect?: boolean;
  label: string;
}

export const LanguageSelect: React.FC<Props> = ({ 
  value, 
  onChange, 
  includeEnglish = false, 
  includeAutoDetect = false,
  label 
}) => {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      <label className="text-[11px] font-bold text-slate-400 uppercase tracking-widest pl-1">{label}</label>
      <div className="relative group">
        <select
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="appearance-none w-full bg-slate-50 border border-slate-200 hover:border-indigo-300 hover:bg-white px-4 py-3 pr-10 rounded-xl shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-100 focus:border-indigo-500 text-slate-700 font-semibold transition-all cursor-pointer text-sm"
        >
          {includeAutoDetect && <option value="Auto-detect">✨ Auto-detect</option>}
          {includeEnglish && <option value="English">English</option>}
          {Object.values(IndianLanguage).map((lang) => (
            <option key={lang} value={lang}>
              {lang}
            </option>
          ))}
        </select>
        <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400 group-hover:text-indigo-500 transition-colors">
          <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
            <path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z" />
          </svg>
        </div>
      </div>
    </div>
  );
};