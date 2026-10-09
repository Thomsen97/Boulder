import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import nb from "./nb.json";

// Only Norwegian bokmål is shipped. When a second language is added, pick it from
// expo-localization's getLocales() here and add its resource.
const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { nb: { translation: nb } },
  lng: "nb",
  fallbackLng: "nb",
  interpolation: { escapeValue: false },
});

export default i18n;
