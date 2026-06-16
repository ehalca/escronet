"use client";

import { useEffect } from "react";
import i18n from "i18next";
import { initReactI18next } from "react-i18next";
import { resources, SUPPORTED_LANGUAGES } from "@escronet/i18n";
import type { SupportedLanguage } from "@escronet/i18n";

let initialized = false;

function ensureInitialized(lang: string): void {
  if (initialized) return;
  initialized = true;
  i18n.use(initReactI18next).init({
    resources,
    lng: lang,
    fallbackLng: "en",
    interpolation: { escapeValue: false },
  });
}

export function I18nProvider({
  lang,
  children,
}: {
  lang: string;
  children: React.ReactNode;
}) {
  const safeLang: SupportedLanguage = (
    SUPPORTED_LANGUAGES as readonly string[]
  ).includes(lang)
    ? (lang as SupportedLanguage)
    : "en";

  ensureInitialized(safeLang);

  useEffect(() => {
    if (i18n.language !== safeLang) {
      i18n.changeLanguage(safeLang);
    }
  }, [safeLang]);

  return <>{children}</>;
}
