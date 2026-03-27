'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the supported languages
export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
];

type LanguageContextType = {
  currentLanguage: string;
  setLanguage: (lang: string) => void;
  translateText: (text: string, targetLang: string) => Promise<string>;
};

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function LanguageProvider({ children }: { children: ReactNode }) {
  const [currentLanguage, setCurrentLanguage] = useState('en');

  // Optional: Persist language setting to localStorage
  useEffect(() => {
    const saved = localStorage.getItem('cariskill_language');
    if (saved) setCurrentLanguage(saved);
  }, []);

  const setLanguage = (lang: string) => {
    setCurrentLanguage(lang);
    localStorage.setItem('cariskill_language', lang);
  };

  const translateText = async (text: string, targetLang: string): Promise<string> => {
    if (!text || targetLang === 'en') return text;
    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage: targetLang }),
      });
      if (!res.ok) return text;
      const data = await res.json();
      return data.translatedText || text;
    } catch (err) {
      console.error("Translation API error", err);
      return text;
    }
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, setLanguage, translateText }}>
      {children}
    </LanguageContext.Provider>
  );
}

export function useLanguage() {
  const context = useContext(LanguageContext);
  if (context === undefined) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
}
