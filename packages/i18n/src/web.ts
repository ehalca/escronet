import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { SUPPORTED_LANGUAGES, resources } from "./index";

const raw = typeof navigator !== "undefined" ? navigator.language : "en";
const code = (raw ?? "en").split(/[-_]/)[0].toLowerCase();
const lng = (SUPPORTED_LANGUAGES as readonly string[]).includes(code) ? code : "en";

i18n.use(initReactI18next).init({
  resources,
  lng,
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
