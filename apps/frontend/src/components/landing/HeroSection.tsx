"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ShieldIcon } from "./ShieldIcon";

const TECH_BADGES = [
  "Whisper STT",
  "ONNX Runtime",
  "On-device ML",
  "Zero Cloud",
];

function PhoneMockup() {
  return (
    <div className="relative mx-auto w-65 h-130 rounded-[40px] border-4 border-navy-700 bg-navy-800 shadow-2xl shadow-black/60 overflow-hidden">
      {/* Notch */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-24 h-7 bg-navy-900 rounded-b-2xl z-10" />

      {/* Status bar */}
      <div className="flex justify-between items-center px-6 pt-10 pb-2 text-[10px] text-muted">
        <span>9:41</span>
        <div className="flex items-center gap-1">
          <span className="w-1 h-2 bg-muted rounded-sm" />
          <span className="w-1 h-3 bg-muted rounded-sm" />
          <span className="w-1 h-4 bg-sky-400 rounded-sm" />
          <span className="w-1 h-3 bg-sky-400 rounded-sm" />
        </div>
      </div>

      {/* App content */}
      <div className="px-4 pt-2 flex flex-col gap-3">
        {/* Header */}
        <div className="flex items-center justify-between mb-1">
          <div className="flex items-center gap-1.5">
            <ShieldIcon size={14} />
            <span className="text-xs font-semibold text-white">Escronet</span>
          </div>
          <span className="flex items-center gap-1 text-[10px] text-sky-400">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-400 animate-pulse" />
            Active
          </span>
        </div>

        {/* Alert card - highest risk (pulsing border) */}
        <motion.div
          className="rounded-2xl bg-red-900/40 border border-red-500/40 p-3"
          animate={{ borderColor: ["rgba(239,68,68,0.4)", "rgba(239,68,68,0.8)", "rgba(239,68,68,0.4)"] }}
          transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
        >
          <div className="flex items-start gap-2">
            <motion.span
              className="text-lg"
              animate={{ scale: [1, 1.2, 1] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              🚨
            </motion.span>
            <div>
              <p className="text-[11px] font-bold text-red-400 uppercase tracking-wide">Critical Risk</p>
              <p className="text-[10px] text-gray-300 mt-0.5">Unknown caller · 2m 14s</p>
              <p className="text-[9px] text-gray-400 mt-1 italic">
                &quot;Your bank account has been suspended…&quot;
              </p>
            </div>
          </div>
        </motion.div>

        {/* Alert card - medium */}
        <div className="rounded-2xl bg-yellow-900/30 border border-yellow-500/30 p-3">
          <div className="flex items-start gap-2">
            <span className="text-base">⚠️</span>
            <div>
              <p className="text-[11px] font-bold text-yellow-400 uppercase tracking-wide">Medium Risk</p>
              <p className="text-[10px] text-gray-300 mt-0.5">Unknown caller · 45s</p>
            </div>
          </div>
        </div>

        {/* Alert card - low */}
        <div className="rounded-2xl bg-green-900/20 border border-green-500/20 p-3">
          <div className="flex items-start gap-2">
            <span className="text-base">✅</span>
            <div>
              <p className="text-[11px] font-bold text-green-400 uppercase tracking-wide">Minimal Risk</p>
              <p className="text-[10px] text-gray-300 mt-0.5">Unknown caller · 1m 02s</p>
            </div>
          </div>
        </div>

        {/* Guardian notification */}
        <div className="rounded-xl bg-sky-900/30 border border-sky-500/30 p-2.5">
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
      {/* Dot grid */}
      <div
        className="absolute inset-0 pointer-events-none opacity-20"
        style={{
          backgroundImage: "radial-gradient(circle, #1E3A5F 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      {/* Ambient glows */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/4 w-125 h-125 rounded-full bg-sky-400/5 blur-[120px]" />
        <div className="absolute bottom-1/3 right-1/4 w-100 h-100 rounded-full bg-blue-600/5 blur-[100px]" />
      </div>

      <div className="relative max-w-6xl mx-auto w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
        {/* Left: copy */}
        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="flex flex-col gap-6"
        >
          {/* Badge */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="inline-flex w-fit items-center gap-2 px-3 py-1.5 rounded-full border border-sky-400/30 bg-sky-400/10 text-sky-400 text-sm font-medium"
          >
            <ShieldIcon size={14} />
            On-device · Privacy first · Open source
          </motion.div>

          <h1 className="text-4xl sm:text-5xl lg:text-6xl font-bold leading-tight text-white">
            {t("landing.hero.headline")}
          </h1>

          <p className="text-lg text-muted leading-relaxed max-w-xl">
            {t("landing.hero.subhead")}
          </p>

          {/* CTA buttons */}
          <div id="download" className="flex flex-wrap gap-4 pt-2">
            <div className="relative">
              <a
                href="https://play.google.com/apps/testing/com.escronet"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-3 px-5 py-3 rounded-xl bg-sky-400 text-navy-900 font-semibold hover:bg-sky-300 transition-colors"
              >
                <AndroidIcon />
                <span className="flex flex-col leading-tight">
                  <span>{t("landing.hero.ctaAndroid")}</span>
                  <span className="text-xs font-normal opacity-70">{t("landing.hero.ctaAndroidBeta")}</span>
                </span>
              </a>
              <span className="absolute -top-2 -right-2 px-1.5 py-0.5 rounded-full bg-yellow-400 text-navy-900 text-[10px] font-bold leading-none">
                β
              </span>
            </div>
            <a
              href="#"
              className="flex items-center gap-3 px-5 py-3 rounded-xl border border-navy-700 text-muted hover:border-sky-400/50 hover:text-white transition-colors cursor-not-allowed"
              aria-disabled="true"
            >
              <AppleIcon />
              {t("landing.hero.ctaIos")}
            </a>
          </div>

          {/* Tech badges */}
          <div className="flex flex-wrap gap-2">
            {TECH_BADGES.map((b) => (
              <span
                key={b}
                className="px-2.5 py-1 rounded-full text-xs text-muted border border-navy-700 bg-navy-800/60"
              >
                {b}
              </span>
            ))}
          </div>
        </motion.div>

        {/* Right: phone + shield watermark */}
        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.9, delay: 0.2, ease: "easeOut" }}
          className="relative flex justify-center items-center"
        >
          {/* Radial glow behind phone */}
          <div className="absolute w-80 h-80 rounded-full bg-sky-400/8 blur-3xl" />

          {/* Shield watermark */}
          <ShieldIcon
            size={310}
            className="absolute opacity-[0.055] select-none"
          />

          {/* Phone sits on top */}
          <div className="relative z-10">
            <PhoneMockup />
          </div>
        </motion.div>
      </div>

      {/* Scroll hint */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.6 }}
        className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1"
      >
        <span className="text-xs text-muted/60 tracking-widest uppercase">Scroll</span>
        <motion.div
          animate={{ y: [0, 6, 0] }}
          transition={{ duration: 1.4, repeat: Infinity, ease: "easeInOut" }}
          className="w-px h-6 bg-linear-to-b from-muted/40 to-transparent"
        />
      </motion.div>
    </section>
  );
}

function AndroidIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M17.523 15.342c-.306 0-.554-.248-.554-.554V9.79c0-.306.248-.554.554-.554s.554.248.554.554v4.998c0 .306-.248.554-.554.554zm-11.046 0c-.306 0-.554-.248-.554-.554V9.79c0-.306.248-.554.554-.554s.554.248.554.554v4.998c0 .306-.248.554-.554.554zm1.385-9.5l1.089-1.939a.234.234 0 00-.087-.32.236.236 0 00-.32.087L7.42 5.67a7.51 7.51 0 00-2.786 1.406h14.732A7.51 7.51 0 0016.58 5.67l-1.124-2a.234.234 0 00-.32-.087.234.234 0 00-.087.32l1.089 1.939A7.477 7.477 0 0012 5.096a7.477 7.477 0 00-4.138 1.746zM9.5 5.06a.44.44 0 110-.881.44.44 0 010 .881zm5 0a.44.44 0 110-.881.44.44 0 010 .881zM4.977 8.185v9.137c0 .617.502 1.118 1.118 1.118h.678v2.451c0 .613.498 1.109 1.109 1.109.613 0 1.109-.496 1.109-1.109V18.44h2.018v2.451c0 .613.496 1.109 1.109 1.109s1.109-.496 1.109-1.109V18.44h.678c.617 0 1.118-.501 1.118-1.118V8.185H4.977z" />
    </svg>
  );
}

function AppleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.8-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M13 3.5c.73-.83 1.94-1.46 2.94-1.5.13 1.17-.34 2.35-1.04 3.19-.69.85-1.83 1.51-2.95 1.42-.15-1.15.41-2.35 1.05-3.11z" />
    </svg>
  );
}
