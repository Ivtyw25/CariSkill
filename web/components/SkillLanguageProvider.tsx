'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useSkillTranslation } from '@/hooks/useSkillTranslation';

export const SUPPORTED_LANGUAGES = [
  { code: 'en', name: 'English', flag: '🇬🇧' },
  { code: 'ms', name: 'Malay', flag: '🇲🇾' },
  { code: 'zh', name: 'Chinese', flag: '🇨🇳' },
  { code: 'ta', name: 'Tamil', flag: '🇮🇳' },
  { code: 'es', name: 'Spanish', flag: '🇪🇸' },
];

type LanguageContextType = {
  currentLanguage: string;
  setLanguage: (lang: string) => Promise<void>;
  translateText: (text: string | string[], forceLanguage?: string) => Promise<any>;
  isLoadingLanguage: boolean;
};

const SkillLanguageContext = createContext<LanguageContextType | undefined>(undefined);

export function SkillLanguageProvider({ children, roadmapId }: { children: ReactNode, roadmapId: string }) {
  const [currentLanguage, setCurrentLanguage] = useState('en');
  const [isLoadingLanguage, setIsLoadingLanguage] = useState(true);
  const { translateText } = useSkillTranslation(currentLanguage);

  useEffect(() => {
    const fetchPref = async () => {
      try {
        const res = await fetch(`/api/preferences/language?roadmapId=${roadmapId}`);
        if (res.ok) {
          const data = await res.json();
          if (data.preferred_language) {
            setCurrentLanguage(data.preferred_language);
          }
        }
      } catch (err) {
         console.error(err);
      } finally {
        setIsLoadingLanguage(false);
      }
    };
    if (roadmapId) {
      fetchPref();
    } else {
      setIsLoadingLanguage(false);
    }
  }, [roadmapId]);

  const setLanguage = async (lang: string) => {
    setCurrentLanguage(lang); // Optimistic UI update
    if (!roadmapId) return;
    try {
      await fetch('/api/preferences/language', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ roadmapId, preferredLanguage: lang })
      });
    } catch (err) {
       console.error(err);
    }
  };

  return (
    <SkillLanguageContext.Provider value={{ currentLanguage, setLanguage, translateText, isLoadingLanguage }}>
      {children}
    </SkillLanguageContext.Provider>
  );
}

export function useSkillLanguage() {
  const context = useContext(SkillLanguageContext);
  if (context === undefined) {
    throw new Error('useSkillLanguage must be used within a SkillLanguageProvider');
  }
  return context;
}
