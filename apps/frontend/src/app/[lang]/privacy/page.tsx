"use client";

import { useTranslation } from "react-i18next";
import { NavBar } from "@/components/landing/NavBar";
import { Footer } from "@/components/landing/Footer";
import { use } from "react";

const SECTIONS = ["s1", "s2", "s3", "s4", "s5", "s6", "s7", "s8", "s9"] as const;

export default function PrivacyPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = use(params);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <NavBar lang={lang} />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl font-bold text-sky-400 mb-2">
          {t("landing.privacyPage.title")}
        </h1>
        <p className="text-muted text-sm mb-12">{t("landing.privacyPage.updated")}</p>

        <p className="text-gray-300 leading-relaxed mb-12">
          {t("landing.privacyPage.intro")}
        </p>

        <div className="space-y-10">
          {SECTIONS.map((s) => (
            <section key={s}>
              <h2 className="text-xl font-semibold text-white mb-3">
                {t(`landing.privacyPage.${s}t`)}
              </h2>
              <p className="text-gray-300 leading-relaxed">
                {t(`landing.privacyPage.${s}b`)}
              </p>
            </section>
          ))}
        </div>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
