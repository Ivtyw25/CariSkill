'use client';

import { useState, useRef, useEffect } from 'react';
import { useSkillLanguage, SUPPORTED_LANGUAGES } from '@/components/SkillLanguageProvider';
import { Globe, Check, Loader2 } from 'lucide-react';

export default function SkillLanguageSelector() {
  const { currentLanguage, setLanguage, isLoadingLanguage } = useSkillLanguage();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  const activeLang = SUPPORTED_LANGUAGES.find((l) => l.code === currentLanguage) || SUPPORTED_LANGUAGES[0];

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isLoadingLanguage}
        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-full hover:bg-gray-50 hover:border-gray-300 transition-all font-bold text-sm text-gray-700 shadow-sm disabled:opacity-50"
      >
        {isLoadingLanguage ? <Loader2 className="w-4 h-4 animate-spin text-gray-500" /> : <Globe className="w-4 h-4 text-gray-500" />}
        <span className="hidden sm:inline">{activeLang.name}</span>
        <span className="sm:hidden uppercase">{activeLang.code}</span>
      </button>

      {isOpen && (
        <div className="absolute right-0 mt-2 w-48 bg-white border border-gray-100 rounded-2xl shadow-xl py-2 z-50 animate-in fade-in slide-in-from-top-2">
          {SUPPORTED_LANGUAGES.map((lang) => (
            <button
              key={lang.code}
              onClick={() => {
                setLanguage(lang.code);
                setIsOpen(false);
              }}
              className="w-full text-left px-4 py-2.5 hover:bg-yellow-50 flex items-center justify-between group transition-colors"
            >
              <div className="flex items-center gap-3">
                <span className="text-lg">{lang.flag}</span>
                <span className={`text-sm ${currentLanguage === lang.code ? 'font-bold text-gray-900' : 'font-medium text-gray-600 group-hover:text-gray-900'}`}>
                  {lang.name}
                </span>
              </div>
              {currentLanguage === lang.code && (
                <Check className="w-4 h-4 text-[#CA8A04]" />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
