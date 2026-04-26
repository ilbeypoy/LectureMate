import i18n from 'i18next';
import { initReactI18next } from 'react-i18next';
import * as Localization from 'expo-localization';
import { en } from './translations/en';
import { tr } from './translations/tr';

export const SUPPORTED_LANGUAGES = ['en', 'tr'] as const;
export type Language = typeof SUPPORTED_LANGUAGES[number];

function getDeviceLanguage(): Language {
  const locales = Localization.getLocales();
  const deviceLang = locales[0]?.languageCode?.toLowerCase();
  if (deviceLang === 'tr') return 'tr';
  return 'en';
}

i18n
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      tr: { translation: tr },
    },
    lng: getDeviceLanguage(),
    fallbackLng: 'en',
    interpolation: { escapeValue: false },
    compatibilityJSON: 'v4',
  });

export function setLanguage(lang: Language | 'auto') {
  if (lang === 'auto') {
    i18n.changeLanguage(getDeviceLanguage());
  } else {
    i18n.changeLanguage(lang);
  }
}

export default i18n;
