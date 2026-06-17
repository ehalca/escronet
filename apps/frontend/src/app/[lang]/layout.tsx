import type { Metadata } from "next";
import { QueryProvider } from "@/providers/query-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { SUPPORTED_LANGUAGES } from "@escronet/i18n";
import { notFound } from "next/navigation";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://escronet.com").replace(/\/$/, "");

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ lang: string }>;
}): Promise<Metadata> {
  const { lang } = await params;
  const canonical = lang === "en" ? BASE : `${BASE}/${lang}`;

  return {
    alternates: {
      canonical,
      languages: {
        "x-default": BASE,
        en: BASE,
        ro: `${BASE}/ro`,
        ru: `${BASE}/ru`,
      },
    },
    openGraph: {
      locale: lang === "ro" ? "ro_RO" : lang === "ru" ? "ru_RU" : "en_US",
    },
  };
}

export default async function LangLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ lang: string }>;
}) {
  const { lang } = await params;
  if (!(SUPPORTED_LANGUAGES as readonly string[]).includes(lang)) {
    notFound();
  }

  return (
    <QueryProvider>
      <I18nProvider lang={lang}>{children}</I18nProvider>
    </QueryProvider>
  );
}
