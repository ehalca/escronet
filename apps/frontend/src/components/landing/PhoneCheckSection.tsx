"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useMutation } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";
import type { CallerCheckResult } from "@escronet/shared";

const RISK_LEVELS = [
  { key: "lowest" as const, color: "bg-green-400", text: "text-green-400", labelKey: "lowest" },
  { key: "low" as const, color: "bg-lime-400", text: "text-lime-400", labelKey: "low" },
  { key: "medium" as const, color: "bg-yellow-400", text: "text-yellow-400", labelKey: "medium" },
  { key: "high" as const, color: "bg-orange-400", text: "text-orange-400", labelKey: "high" },
  { key: "highest" as const, color: "bg-red-500", text: "text-red-400", labelKey: "highest" },
];

const RISK_LEVEL_LABELS: Record<string, string> = {
  lowest: "Minimal",
  low: "Low",
  medium: "Medium",
  high: "High",
  highest: "Critical",
};

function ResultCard({ result }: { result: CallerCheckResult }) {
  const { t } = useTranslation();
  const isClean = !result.inCallerDatabase && result.totalAlerts === 0;
  const total = result.totalAlerts;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, ease: "easeOut" }}
      className="mt-6 rounded-2xl border overflow-hidden"
      style={{
        borderColor: isClean ? "rgb(34 197 94 / 0.3)" : "rgb(239 68 68 / 0.3)",
      }}
    >
      {/* Header */}
      <div
        className={`flex items-center gap-3 px-5 py-4 ${
          isClean ? "bg-green-900/20" : "bg-red-900/20"
        }`}
      >
        <span className="text-2xl">{isClean ? "✅" : "⚠️"}</span>
        <div>
          <p className={`font-bold ${isClean ? "text-green-400" : "text-red-400"}`}>
            {isClean ? t("landing.phoneCheck.resultClean") : t("landing.phoneCheck.resultWarning")}
          </p>
          {isClean && (
            <p className="text-sm text-muted mt-0.5">
              {t("landing.phoneCheck.resultCleanSub")}
            </p>
          )}
          {result.inCallerDatabase && (
            <p className="text-sm text-orange-400 mt-0.5">
              {t("landing.phoneCheck.resultWarning_banned")}
              {result.callerRiskLevel && (
                <span className="ml-2 font-medium">
                  — {RISK_LEVEL_LABELS[result.callerRiskLevel] ?? result.callerRiskLevel}
                </span>
              )}
            </p>
          )}
        </div>
      </div>

      {/* Alert stats */}
      {!isClean && (
        <div className="px-5 py-4 flex flex-col gap-4 bg-navy-800/60">
          <div className="flex items-center justify-between">
            <span className="text-sm text-muted">{t("landing.phoneCheck.totalAlerts")}</span>
            <span className="text-xl font-bold text-white">{total.toLocaleString()}</span>
          </div>

          {total > 0 && (
            <>
              <p className="text-xs font-semibold text-muted uppercase tracking-wider">
                {t("landing.phoneCheck.alertsByLevel")}
              </p>
              <div className="flex flex-col gap-3">
                {RISK_LEVELS.map((level) => {
                  const count = result.alertsByLevel[level.key];
                  const pct = total > 0 ? (count / total) * 100 : 0;
                  return (
                    <div key={level.key} className="flex items-center gap-3">
                      <span className={`w-16 text-xs font-medium ${level.text} text-right`}>
                        {t(`landing.stats.${level.labelKey}`)}
                      </span>
                      <div className="flex-1 h-1.5 rounded-full bg-navy-700 overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${level.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.8, delay: 0.1, ease: "easeOut" }}
                        />
                      </div>
                      <span className="w-8 text-xs text-muted text-right tabular-nums">
                        {count}
                      </span>
                    </div>
                  );
                })}
              </div>
            </>
          )}

          {total === 0 && (
            <p className="text-sm text-muted">{t("landing.phoneCheck.noAlerts")}</p>
          )}
        </div>
      )}
    </motion.div>
  );
}

export function PhoneCheckSection() {
  const { t } = useTranslation();
  const [phone, setPhone] = useState("");

  const mutation = useMutation({
    mutationFn: (p: string) => api.stats.callerCheck({ phone: p }),
  });

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const trimmed = phone.trim();
    if (!trimmed) return;
    mutation.mutate(trimmed);
  }

  return (
    <section className="py-24 px-6">
      <div className="max-w-2xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white text-center mb-3">
            {t("landing.phoneCheck.title")}
          </h2>
          <p className="text-muted text-center mb-8">
            {t("landing.phoneCheck.subtitle")}
          </p>

          <form onSubmit={handleSubmit} className="flex flex-col sm:flex-row gap-3">
            <div className="flex-1 relative">
              <input
                type="tel"
                value={phone}
                onChange={(e) => {
                  setPhone(e.target.value);
                  if (mutation.data || mutation.isError) mutation.reset();
                }}
                placeholder={t("landing.phoneCheck.placeholder")}
                className="w-full px-4 py-3 rounded-xl border border-navy-700 bg-navy-800 text-white placeholder-muted focus:outline-none focus:border-sky-400/60 transition-colors"
                autoComplete="tel"
              />
            </div>
            <button
              type="submit"
              disabled={mutation.isPending || !phone.trim()}
              className="px-6 py-3 rounded-xl bg-sky-400 text-navy-900 font-semibold hover:bg-sky-300 transition-colors disabled:opacity-50 disabled:cursor-not-allowed whitespace-nowrap"
            >
              {mutation.isPending
                ? t("landing.phoneCheck.checking")
                : t("landing.phoneCheck.cta")}
            </button>
          </form>

          <p className="text-xs text-muted mt-2 text-center">
            {t("landing.phoneCheck.hint")}
          </p>

          <AnimatePresence mode="wait">
            {mutation.isError && (
              <motion.p
                key="error"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="mt-4 text-center text-sm text-red-400"
              >
                Something went wrong. Please try again.
              </motion.p>
            )}
            {mutation.data && (
              <ResultCard key="result" result={mutation.data} />
            )}
          </AnimatePresence>
        </motion.div>
      </div>
    </section>
  );
}
