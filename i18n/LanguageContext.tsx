
import React, { createContext, useContext, useState } from 'react';
import { en } from './en';
import { sv } from './sv';
import { nl } from './nl';
import { es } from './es';
import { fr } from './fr';
import { de } from './de';
import { it } from './it';

export type Language = 'en' | 'sv' | 'nl' | 'es' | 'fr' | 'de' | 'it';
export type Translations = typeof en;

// Strict mapping ensures all language files satisfy the English schema
const translations: Record<Language, Translations> = { en, sv, nl, es, fr, de, it };

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: Translations;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    const saved = localStorage.getItem('tripshare_lang');
    if (saved && (translations as any)[saved]) return saved as Language;
    return 'en';
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem('tripshare_lang', lang);
  };

  const t = translations[language];

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) throw new Error('useTranslation must be used within LanguageProvider');
  return context;
};
