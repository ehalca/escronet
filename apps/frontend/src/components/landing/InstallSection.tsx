"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import i18n from "i18next";

const STEPS = [
  {
    icon: "📥",
    key: "s1",
    color: "text-sky-400",
    bg: "bg-sky-400/10",
    border: "border-sky-400/30",
    link: null,
  },
  {
    icon: "🔐",
    key: "s2",
    color: "text-purple-400",
    bg: "bg-purple-400/10",
    border: "border-purple-400/30",
    link: "permissions",
  },
  {
    icon: "✅",
    key: "s3",
    color: "text-green-400",
    bg: "bg-green-400/10",
    border: "border-green-400/30",
    link: null,
  },
] as const;

const stepVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, delay: i * 0.2, ease: "easeOut" },
  }),
};

export function InstallSection() {
  const { t } = useTranslation();
  const lang = i18n.language ?? "en";

  return (
    <section className="py-24 px-6">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {t("landing.install.title")}
          </h2>
        </motion.div>

        <div className="flex flex-col gap-0">
          {STEPS.map((step, i) => (
            <div key={step.key} className="flex gap-6 items-start">
              <div className="flex flex-col items-center flex-shrink-0">
                <motion.div
                  custom={i}
                  variants={stepVariants}
                  initial="hidden"
                  whileInView="visible"
                  viewport={{ once: true, margin: "-60px" }}
                  className={`w-14 h-14 rounded-2xl ${step.bg} border ${step.border} flex items-center justify-center text-2xl z-10`}
                >
                  {step.icon}
                </motion.div>
                {i < STEPS.length - 1 && (
                  <div className="w-px h-12 bg-navy-700 my-1" />
                )}
              </div>

              <motion.div
                custom={i}
                variants={stepVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                className="pb-10 flex-1"
              >
                <div className={`text-xs font-bold uppercase tracking-widest ${step.color} mb-1`}>
                  {t("landing.install.step")} {i + 1}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t(`landing.install.${step.key}t`)}
                </h3>
                <p className="text-muted leading-relaxed mb-3">
                  {t(`landing.install.${step.key}b`)}
                </p>
                {step.link && (
                  <Link
                    href={lang === "en" ? `/${step.link}` : `/${lang}/${step.link}`}
                    className={`inline-flex items-center gap-1 text-sm font-medium ${step.color} hover:underline`}
                  >
                    {t(`landing.install.${step.key}link`)}
                  </Link>
                )}
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
