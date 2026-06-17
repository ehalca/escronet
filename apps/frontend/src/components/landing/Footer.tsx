"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { usePathname } from "next/navigation";
import { SUPPORTED_LANGUAGES } from "@escronet/i18n";

function useLangHref() {
  const pathname = usePathname();
  return (targetLang: string): string => {
    const seg = pathname.split("/")[1] ?? "";
    const rest = (SUPPORTED_LANGUAGES as readonly string[]).includes(seg)
      ? pathname.slice(seg.length + 1) || "/"
      : pathname;
    return targetLang === "en" ? rest : `/${targetLang}${rest === "/" ? "" : rest}`;
  };
}

const LANG_LABELS: Record<string, string> = { en: "EN", ro: "RO", ru: "RU" };

export function Footer({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const langHref = useLangHref();
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-navy-700 py-12 px-6">
      <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
        <div className="flex flex-col items-center sm:items-start gap-1">
          <span className="text-sky-400 font-bold text-lg">Escronet</span>
          <p className="text-muted text-sm">{t("landing.footer.tagline")}</p>
        </div>

        <div className="flex flex-wrap items-center gap-6 text-sm">
          <a
            href="https://github.com/escronet"
            target="_blank"
            rel="noopener noreferrer"
            className="text-muted hover:text-white transition-colors"
          >
            {t("landing.footer.github")}
          </a>
          <Link href={lang === "en" ? "/privacy" : `/${lang}/privacy`} className="text-muted hover:text-white transition-colors">
            {t("landing.footer.privacy")}
          </Link>

          <div className="flex gap-1">
            {SUPPORTED_LANGUAGES.map((l) => (
              <Link
                key={l}
                href={langHref(l)}
                onClick={() => { void i18n.changeLanguage(l); }}
                className={`px-2 py-0.5 rounded text-xs font-medium transition-colors ${
                  l === lang ? "text-sky-400" : "text-muted hover:text-white"
                }`}
              >
                {LANG_LABELS[l]}
              </Link>
            ))}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto mt-6 pt-6 border-t border-navy-700/50 text-center text-xs text-muted">
        {t("landing.footer.copyright", { year })}
      </div>
    </footer>
  );
}
