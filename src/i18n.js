import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import LanguageDetector from "i18next-browser-languagedetector";

import translationUK from "./config/locales/uk/translation.json";
import translationPL from "./config/locales/pl/translation.json";
import translationJA from "./config/locales/ja/translation.json";

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      uk: {
        translation: translationUK,
      },
      pl: {
        translation: translationPL,
      },
      ja: {
        translation: translationJA,
      },
    },
    fallbackLng: "uk",
    detection: {
      order: ["localStorage", "cookie", "navigator"],

      caches: ["localStorage"],
    },
    interpolation: {
      escapeValue: false,
    },
  });

export default i18n;
