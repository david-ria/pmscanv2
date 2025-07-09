import { useTranslation } from 'react-i18next';
import { useCallback } from 'react';

export const useLanguage = () => {
  const { i18n } = useTranslation();

  const changeLanguage = useCallback((language: string) => {
    i18n.changeLanguage(language);
  }, [i18n]);

  const currentLanguage = i18n.language;
  
  const languages = [
    { code: 'fr', name: 'Français' },
    { code: 'en', name: 'English' }
  ];

  return {
    currentLanguage,
    changeLanguage,
    languages,
    isLanguage: (lang: string) => currentLanguage === lang
  };
};