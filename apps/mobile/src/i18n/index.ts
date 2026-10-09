import { getLocales } from "expo-localization";
import { createInstance } from "i18next";
import { initReactI18next } from "react-i18next";

import nb from "./nb.json";

// Only Norwegian bokmål is shipped; other locales are added later by adding a resource here.
const supported = ["nb"];
const deviceLanguage = getLocales()[0]?.languageCode ?? "nb";
const lng = deviceLanguage && supported.includes(deviceLanguage) ? deviceLanguage : "nb";

const i18n = createInstance();

void i18n.use(initReactI18next).init({
  resources: { nb: { translation: nb } },
  lng,
  fallbackLng: "nb",
  interpolation: { escapeValue: false },
});

export default i18n;
