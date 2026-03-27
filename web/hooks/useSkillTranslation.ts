import { useState, useCallback } from 'react';

// In-memory cache across hook instances to prevent duplicate API requests when switching tabs
const globalTranslationCache = new Map<string, string>(); 

export function useSkillTranslation(currentLanguage: string) {
  const translateText = useCallback(async (text: string | string[], forceLanguage?: string): Promise<any> => {
    const targetLang = forceLanguage || currentLanguage;
    if (!text || targetLang === 'en') return text;

    // Handle array of strings
    if (Array.isArray(text)) {
      const results = [];
      const toTranslateIndices: number[] = [];
      const toTranslateStrings: string[] = [];

      // Check cache first
      text.forEach((str, idx) => {
        const cacheKey = JSON.stringify({ text: str, targetLang });
        if (globalTranslationCache.has(cacheKey)) {
          results[idx] = globalTranslationCache.get(cacheKey)!;
        } else {
          toTranslateIndices.push(idx);
          toTranslateStrings.push(str);
        }
      });

      if (toTranslateStrings.length === 0) return results; // All cached

      try {
        const res = await fetch('/api/translate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ text: toTranslateStrings, targetLanguage: targetLang }),
        });
        if (!res.ok) {
          toTranslateIndices.forEach((origIdx, i) => { results[origIdx] = toTranslateStrings[i]; });
          return results;
        }
        
        const data = await res.json();
        const translatedArray = data.translatedText || [];
        
        toTranslateIndices.forEach((origIdx, i) => {
           const val = translatedArray[i] || toTranslateStrings[i];
           results[origIdx] = val;
           const cacheKey = JSON.stringify({ text: toTranslateStrings[i], targetLang });
           globalTranslationCache.set(cacheKey, val); // Store to cache
        });
        return results;
      } catch (err) {
        console.error("Translation API error", err);
        toTranslateIndices.forEach((origIdx, i) => { results[origIdx] = toTranslateStrings[i]; });
        return results;
      }
    }

    // Single string translation
    const cacheKey = JSON.stringify({ text, targetLang });
    if (globalTranslationCache.has(cacheKey)) {
      return globalTranslationCache.get(cacheKey)!;
    }

    try {
      const res = await fetch('/api/translate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text, targetLanguage: targetLang }),
      });
      if (!res.ok) return text;
      const data = await res.json();
      
      const translated = data.translatedText || text;
      globalTranslationCache.set(cacheKey, translated); // Store to cache
      return translated;
    } catch (err) {
      console.error("Translation API error", err);
      return text;
    }
  }, [currentLanguage]);

  return { translateText };
}
