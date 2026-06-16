"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-[260px] h-[520px] rounded-[40px] border-4 border-navy-700 bg-navy-800 shadow-2xl shadow-black/50 overflow-hidden">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-7 bg-navy-900 rounded-b-2xl" />

      {/* Status bar */}
      <div className="flex justify-between items-center px-6 pt-10 pb-2 text-[10px] text-muted">
        <span>9:41</span>
        <span>●●●</span>
      </div>

      {/* App content */}
      <div className="px-4 pt-2 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white">Escronet</span>
          <span className="text-[10px] text-sky-400">● Active</span>
        </div>

        {/* Alert card - highest risk */}
        <div className="rounded-2xl bg-red-900/40 border border-red-500/40 p-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">🚨</span>
            <div>
              <p className="text-[11px] font-bold text-red-400">CRITICAL RISK</p>
              <p className="text-[10px] text-gray-300 mt-0.5">Unknown caller · 2m 14s</p>
              <p className="text-[9px] text-gray-400 mt-1 italic">
                &quot;Your bank account has been suspended…&quot;
              </p>
            </div>
          </div>
        </div>

        {/* Alert card - medium */}
        <div className="rounded-2xl bg-yellow-900/30 border border-yellow-500/30 p-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">⚠️</span>
            <div>
              <p className="text-[11px] font-bold text-yellow-400">MEDIUM RISK</p>
              <p className="text-[10px] text-gray-300 mt-0.5">Unknown caller · 45s</p>
            </div>
          </div>
        </div>

        {/* Alert card - low */}
        <div className="rounded-2xl bg-green-900/20 border border-green-500/20 p-3">
          <div className="flex items-start gap-2">
            <span className="text-lg">✅</span>
            <div>
              <p className="text-[11px] font-bold text-green-400">MINIMAL RISK</p>
              <p className="text-[10px] text-gray-300 mt-0.5">Unknown caller · 1m 02s</p>
            </div>
          </div>
        </div>

        {/* Guardian notification */}
        <div className="mt-1 rounded-xl bg-sky-900/30 border border-sky-500/30 p-2.5">
          <p className="text-[9px] text-sky-300 font-medium">👤 Guardian alerted — Maria</p>
        </div>
      </div>

      {/* Home indicator */}
      <div className="absolute bottom-3 left-1/2 -translate-x-1/2 w-20 h-1 rounded-full bg-navy-600" />
    </div>
  );
}

export function HeroSection() {
  const { t } = useTranslation();

  return (
    <section className="relative min-h-screen flex items-center pt-20 pb-16 px-6 overflow-hidden">
      {/* Background glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-96 h-96 rounded-full bg-sky-400/5 blur-3xl" />
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 rounded-full bg-sky-400/5 blur-3xl" />
      </div>

      <div className="relative max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col gap-6"
        >
          <div className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 text-sky-400 text-sm font-medium">
            <span className="w-2 h-2 rounded-full bg-sky-400 animate-pulse" />
            On-device · Privacy first · Open source
          </div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white">
            {t("landing.hero.headline")}
          </h1>

          <p className="text-lg text-muted leading-relaxed max-w-xl">
            {t("landing.hero.subhead")}
          </p>

          <div id="download" className="flex flex-wrap gap-4 pt-2">
            <a
              href="#"
              className="flex items-center gap-3 px-5 py-3 rounded-xl bg-sky-400 text-navy-900 font-semibold hover:bg-sky-300 transition-colors"
            >
              <span className="text-xl">🤖</span>
              {t("landing.hero.ctaAndroid")}
            </a>
            <a
              href="#"
              className="flex items-center gap-3 px-5 py-3 rounded-xl border border-navy-700 text-muted hover:border-sky-400/50 hover:text-white transition-colors cursor-not-allowed"
            >
              <span className="text-xl">🍎</span>
              {t("landing.hero.ctaIos")}
            </a>
          </div>
        </motion.div>

        {/* Right: phone mockup */}
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.2, ease: "easeOut" }}
          className="flex justify-center"
        >
          <PhoneMockup />
        </motion.div>
      </div>
    </section>
  );
}
