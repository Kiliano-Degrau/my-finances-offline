import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Import language files
import ptBR from '../languages/pt-br.json';
import en from '../languages/en.json';

type LanguageData = typeof ptBR;

const languages: Record<string, LanguageData> = {
  'pt-br': ptBR,
  'en': en,
};

const languageOrder = ['pt-br', 'en'];

function getNestedValue(obj: any, path: string): string {
  return path.split('.').reduce((acc, part) => acc?.[part], obj) || path;
}

function detectUserLanguage(): string {
  const stored = localStorage.getItem('mfo-language');
  if (stored && languages[stored]) return stored;

  const browserLang = navigator.language.toLowerCase();
  
  if (languages[browserLang]) return browserLang;
  
  const baseLang = browserLang.split('-')[0];
  const match = Object.keys(languages).find(lang => lang.startsWith(baseLang));
  if (match) return match;
  
  return 'en';
}

interface I18nContextType {
  language: string;
  setLanguage: (lang: string) => void;
  t: (key: string, replacements?: Record<string, string | number>) => string;
  availableLanguages: { code: string; name: string }[];
}

const I18nContext = createContext<I18nContextType | undefined>(undefined);

export function I18nProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<string>(() => detectUserLanguage());

  const setLanguage = (lang: string) => {
    if (languages[lang]) {
      setLanguageState(lang);
      localStorage.setItem('mfo-language', lang);
    }
  };

  const t = (key: string, replacements?: Record<string, string | number>): string => {
    let text = getNestedValue(languages[language], key) || getNestedValue(languages['en'], key) || key;
    
    if (replacements) {
      Object.entries(replacements).forEach(([placeholder, value]) => {
        text = text.replace(new RegExp(`{${placeholder}}`, 'g'), String(value));
      });
    }
    
    return text;
  };

  const availableLanguages = languageOrder
    .filter(code => languages[code])
    .map(code => ({
      code,
      name: languages[code].langName,
    }));

  // Add any other languages not in the order
  Object.keys(languages).forEach(code => {
    if (!languageOrder.includes(code)) {
      availableLanguages.push({
        code,
        name: languages[code].langName,
      });
    }
  });

  return (
    <I18nContext.Provider value={{ language, setLanguage, t, availableLanguages }}>
      {children}
    </I18nContext.Provider>
  );
}

export function useI18n() {
  const context = useContext(I18nContext);
  if (!context) {
    throw new Error('useI18n must be used within I18nProvider');
  }
  return context;
}

export function useT() {
  const { t } = useI18n();
  return t;
}
