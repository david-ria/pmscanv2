import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import LanguageDetector from 'i18next-browser-languagedetector';

import fr from './locales/fr.json';
import en from './locales/en.json';
import de from './locales/de.json';
import ca from './locales/ca.json';

const resources = {
  fr: {
    translation: fr
  },
  en: {
    translation: en
  },
  de: {
    translation: de
  },
  ca: {
    translation: ca
  }
};

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources,
    fallbackLng: 'fr', // Default to French since the app is currently in French
    debug: false,
    
    detection: {
      // Order of language detection
      order: ['localStorage', 'navigator', 'htmlTag'],
      // Keys to store language in localStorage
      caches: ['localStorage'],
      lookupLocalStorage: 'i18nextLng',
    },

    interpolation: {
      escapeValue: false, // React already escapes by default
    },

    // Mobile-specific configurations
    returnEmptyString: false,
    returnNull: false,
  });

export default i18n;