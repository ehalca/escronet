"use client";

import { useEffect, useRef } from "react";
import { motion, useMotionValue, useInView, animate } from "framer-motion";
import { useQuery } from "@tanstack/react-query";
import { useTranslation } from "react-i18next";
import { api } from "@/lib/api";

function AnimatedCount({ to, suffix = "" }: { to: number; suffix?: string }) {
  const motionVal = useMotionValue(0);
  const ref = useRef<HTMLSpanElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (!inView || to === 0) return;
    const controls = animate(motionVal, to, {
      duration: 1.8,
      ease: "easeOut",
      onUpdate: (v) => {
        if (displayRef.current) {
          displayRef.current.textContent = Math.round(v).toLocaleString() + suffix;
        }
      },
    });
    return controls.stop;
  }, [inView, to, motionVal, suffix]);

  return (
    <span ref={ref} className="tabular-nums">
      <span ref={displayRef}>{to === 0 ? "0" : "—"}</span>
    </span>
  );
}

const RISK_LEVELS = [
  { key: "lowest", labelKey: "lowest", color: "bg-green-400", text: "text-green-400" },
  { key: "low", labelKey: "low", color: "bg-lime-400", text: "text-lime-400" },
  { key: "medium", labelKey: "medium", color: "bg-yellow-400", text: "text-yellow-400" },
  { key: "high", labelKey: "high", color: "bg-orange-400", text: "text-orange-400" },
  { key: "highest", labelKey: "highest", color: "bg-red-500", text: "text-red-400" },
] as const;

export function StatsSection() {
  const { t } = useTranslation();

  const { data, isLoading } = useQuery({
    queryKey: ["publicStats"],
    queryFn: () => api.stats.public(),
    refetchInterval: 60_000,
    staleTime: 30_000,
  });

  const totalAlerts = data
    ? Object.values(data.alertsByLevel).reduce((a, b) => a + b, 0)
    : 0;

  return (
    <section className="py-24 px-6">
      <div className="max-w-6xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white mb-3">
            {t("landing.stats.title")}
          </h2>
          <p className="text-muted">{t("landing.stats.subtitle")}</p>
        </motion.div>

        {/* Top counters */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 mb-12">
          {[
            { labelKey: "users", value: data?.userCount ?? 0 },
            { labelKey: "guardians", value: data?.guardianCount ?? 0 },
            { labelKey: "alertsTitle", value: totalAlerts },
          ].map(({ labelKey, value }, i) => (
            <motion.div
              key={labelKey}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.6, delay: i * 0.1 }}
              className="rounded-2xl border border-navy-700 bg-navy-800/60 p-6 text-center"
            >
              {isLoading ? (
                <div className="h-10 w-24 mx-auto rounded-lg bg-navy-700 animate-pulse mb-2" />
              ) : (
                <p className="text-4xl font-bold text-sky-400">
                  <AnimatedCount to={value} />
                </p>
              )}
              <p className="text-muted text-sm mt-1">{t(`landing.stats.${labelKey}`)}</p>
            </motion.div>
          ))}
        </div>

        {/* Alert bars by risk level */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.6 }}
          className="rounded-2xl border border-navy-700 bg-navy-800/60 p-6"
        >
          <h3 className="text-sm font-semibold text-muted uppercase tracking-wider mb-6">
            {t("landing.stats.alertsTitle")}
          </h3>
          <div className="flex flex-col gap-4">
            {RISK_LEVELS.map((level) => {
              const count = data?.alertsByLevel[level.key] ?? 0;
              const pct = totalAlerts > 0 ? (count / totalAlerts) * 100 : 0;
              return (
                <div key={level.key} className="flex items-center gap-4">
                  <span className={`w-20 text-sm font-medium ${level.text} text-right`}>
                    {t(`landing.stats.${level.labelKey}`)}
                  </span>
                  <div className="flex-1 h-2 rounded-full bg-navy-700 overflow-hidden">
                    <motion.div
                      className={`h-full rounded-full ${level.color}`}
                      initial={{ width: 0 }}
                      whileInView={{ width: `${pct}%` }}
                      viewport={{ once: true }}
                      transition={{ duration: 1.2, delay: 0.2, ease: "easeOut" }}
                    />
                  </div>
                  <span className="w-12 text-sm text-muted text-right tabular-nums">
                    {isLoading ? "—" : count.toLocaleString()}
                  </span>
                </div>
              );
            })}
          </div>
        </motion.div>
      </div>
    </section>
  );
}
