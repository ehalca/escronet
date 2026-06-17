"use client";

import Link from "next/link";
import { useTranslation } from "react-i18next";
import i18n from "i18next";
import { usePathname } from "next/navigation";
import { SUPPORTED_LANGUAGES } from "@escronet/i18n";
import { ShieldIcon } from "./ShieldIcon";

const LANG_LABELS: Record<string, string> = { en: "EN", ro: "RO", ru: "RU" };

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

export function NavBar({ lang }: { lang: string }) {
  const { t } = useTranslation();
  const langHref = useLangHref();

  return (
    <header className="fixed top-0 left-0 right-0 z-50 flex items-center justify-between px-6 py-4 bg-navy-900/90 backdrop-blur-sm border-b border-navy-700">
      <Link href={lang === "en" ? "/" : `/${lang}`} className="flex items-center gap-2.5">
        <ShieldIcon size={24} />
        <span className="text-sky-400 font-bold text-xl tracking-tight">Escronet</span>
      </Link>

      <nav className="flex items-center gap-6">
        <div className="flex gap-1 rounded-lg border border-navy-700 p-1">
          {SUPPORTED_LANGUAGES.map((l) => (
            <Link
              key={l}
              href={langHref(l)}
              onClick={() => { void i18n.changeLanguage(l); }}
              className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${
                l === lang
                  ? "bg-sky-400 text-navy-900"
                  : "text-muted hover:text-white"
              }`}
            >
              {LANG_LABELS[l]}
            </Link>
          ))}
        </div>

        <a
          href="#download"
          className="hidden sm:block px-4 py-2 rounded-lg bg-sky-400 text-navy-900 text-sm font-semibold hover:bg-sky-300 transition-colors"
        >
          {t("landing.nav.download")}
        </a>
      </nav>
    </header>
  );
}
