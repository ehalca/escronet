"use client";

import { use, useState } from "react";
import { useTranslation } from "react-i18next";
import { useRouter } from "next/navigation";
import { NavBar } from "@/components/landing/NavBar";
import { Footer } from "@/components/landing/Footer";

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export default function DeleteAccountPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = use(params);
  const { t } = useTranslation();
  const router = useRouter();

  const [userId, setUserId] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");

    if (!userId.trim()) {
      setError(t("landing.deleteAccount.errorRequired"));
      return;
    }
    if (!UUID_RE.test(userId.trim())) {
      setError(t("landing.deleteAccount.errorFormat"));
      return;
    }
    if (!confirmed) {
      setError(t("landing.deleteAccount.errorConfirm"));
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/v1/account/delete`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: userId.trim() }),
      });

      if (res.status === 404) {
        setError(t("landing.deleteAccount.errorNotFound"));
        return;
      }
      if (!res.ok) {
        setError(t("landing.deleteAccount.errorGeneric"));
        return;
      }

      router.push(`/${lang}/delete-account/success`);
    } catch {
      setError(t("landing.deleteAccount.errorGeneric"));
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <NavBar lang={lang} />

      <main className="max-w-xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-3xl font-bold text-sky-400 mb-4">
          {t("landing.deleteAccount.title")}
        </h1>
        <p className="text-gray-300 leading-relaxed mb-10">
          {t("landing.deleteAccount.subtitle")}
        </p>

        <form onSubmit={handleSubmit} noValidate className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-gray-200 mb-2">
              {t("landing.deleteAccount.userIdLabel")}
            </label>
            <input
              type="text"
              value={userId}
              onChange={(e) => setUserId(e.target.value)}
              placeholder={t("landing.deleteAccount.userIdPlaceholder")}
              className="w-full bg-navy-800 border border-navy-700 rounded-lg px-4 py-3 text-white placeholder-muted focus:outline-none focus:border-sky-400 font-mono text-sm"
              spellCheck={false}
              autoComplete="off"
            />
            <p className="mt-2 text-xs text-muted">
              {t("landing.deleteAccount.userIdHint")}
            </p>
          </div>

          <label className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={(e) => setConfirmed(e.target.checked)}
              className="mt-1 h-4 w-4 accent-sky-400 shrink-0"
            />
            <span className="text-sm text-gray-300">
              {t("landing.deleteAccount.confirmLabel")}
            </span>
          </label>

          {error && (
            <p className="text-red-400 text-sm">{error}</p>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-red-600 hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 rounded-lg transition-colors"
          >
            {submitting
              ? t("landing.deleteAccount.submitting")
              : t("landing.deleteAccount.submit")}
          </button>
        </form>
      </main>

      <Footer lang={lang} />
    </div>
  );
}
