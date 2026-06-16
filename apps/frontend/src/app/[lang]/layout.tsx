import { QueryProvider } from "@/providers/query-provider";
import { I18nProvider } from "@/providers/i18n-provider";
import { SUPPORTED_LANGUAGES } from "@escronet/i18n";
import { notFound } from "next/navigation";

export function generateStaticParams() {
  return SUPPORTED_LANGUAGES.map((lang) => ({ lang }));
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
