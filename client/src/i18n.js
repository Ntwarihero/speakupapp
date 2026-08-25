import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import en from './locales/en/translation.json';
import fr from './locales/fr/translation.json';
import rw from './locales/rw/translation.json';
import sw from './locales/sw/translation.json';

const saved = localStorage.getItem('speakup_lang') || 'en';

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    fr: { translation: fr },
    rw: { translation: rw },
    sw: { translation: sw },
  },
  lng: saved,
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
});

i18n.on('languageChanged', (lng) => {
  localStorage.setItem('speakup_lang', lng);
  document.documentElement.lang = lng;
});

document.documentElement.lang = saved;

export default i18n;
