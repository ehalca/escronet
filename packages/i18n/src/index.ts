import en from "./locales/en.json";
import ro from "./locales/ro.json";
import ru from "./locales/ru.json";

export const SUPPORTED_LANGUAGES = ["en", "ro", "ru"] as const;
export type SupportedLanguage = (typeof SUPPORTED_LANGUAGES)[number];

export const resources = {
  en: { translation: en },
  ro: { translation: ro },
  ru: { translation: ru },
} as const;
