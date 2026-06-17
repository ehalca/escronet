"use client";

import { use } from "react";
import { useTranslation } from "react-i18next";
import Link from "next/link";
import { NavBar } from "@/components/landing/NavBar";
import { Footer } from "@/components/landing/Footer";

export default function DeleteAccountSuccessPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = use(params);
  const { t } = useTranslation();

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <NavBar lang={lang} />

      <main className="max-w-xl mx-auto px-6 pt-32 pb-24 text-center">
        <div className="mb-8 flex justify-center">
          <svg width="64" height="64" viewBox="0 0 64 64" fill="none" aria-hidden="true">
            <circle cx="32" cy="32" r="32" fill="#1E3A5F" />
            <path
              d="M18 32l10 10 18-18"
              stroke="#4FC3F7"
              strokeWidth="4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </div>

        <h1 className="text-3xl font-bold text-sky-400 mb-4">
          {t("landing.deleteAccountSuccess.title")}
        </h1>
        <p className="text-gray-300 leading-relaxed mb-10">
          {t("landing.deleteAccountSuccess.body")}
        </p>

        <Link
          href={`/${lang}`}
          className="inline-block bg-sky-500 hover:bg-sky-400 text-navy-900 font-semibold px-8 py-3 rounded-lg transition-colors"
        >
          {t("landing.deleteAccountSuccess.back")}
        </Link>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
