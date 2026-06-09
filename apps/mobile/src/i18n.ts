import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { NativeModules, Platform } from "react-native";
import { resources, SUPPORTED_LANGUAGES } from "@escronet/i18n";

function detectLanguage(): string {
  const raw: string | undefined =
    Platform.OS === "android"
      ? NativeModules.I18nManager?.localeIdentifier
      : NativeModules.SettingsManager?.settings?.AppleLocale ??
        NativeModules.SettingsManager?.settings?.AppleLanguages?.[0];
  const code = (raw ?? "en").split(/[-_]/)[0].toLowerCase();
  return (SUPPORTED_LANGUAGES as readonly string[]).includes(code) ? code : "en";
}

i18n.use(initReactI18next).init({
  resources,
  lng: detectLanguage(),
  fallbackLng: "en",
  interpolation: { escapeValue: false },
});

export default i18n;
