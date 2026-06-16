"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const STEPS = [
  { icon: "📞", keyTitle: "step1Title", keyBody: "step1Body", color: "text-sky-400", bg: "bg-sky-400/10", border: "border-sky-400/30" },
  { icon: "🔒", keyTitle: "step2Title", keyBody: "step2Body", color: "text-purple-400", bg: "bg-purple-400/10", border: "border-purple-400/30" },
  { icon: "🚨", keyTitle: "step3Title", keyBody: "step3Body", color: "text-red-400", bg: "bg-red-400/10", border: "border-red-400/30" },
] as const;

const stepVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: (i: number) => ({
    opacity: 1,
    x: 0,
    transition: { duration: 0.6, delay: i * 0.2, ease: "easeOut" },
  }),
};

export function HowItWorksSection() {
  const { t } = useTranslation();

  return (
    <section className="py-24 px-6 bg-navy-800/40">
      <div className="max-w-4xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-16"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {t("landing.howItWorks.title")}
          </h2>
        </motion.div>

        <div className="flex flex-col gap-0">
          {STEPS.map((step, i) => (
            <div key={step.keyTitle} className="flex gap-6 items-start">
              {/* Step indicator + connector line */}
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

              {/* Content */}
              <motion.div
                custom={i}
                variants={stepVariants}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, margin: "-60px" }}
                className="pb-10 flex-1"
              >
                <div className={`text-xs font-bold uppercase tracking-widest ${step.color} mb-1`}>
                  Step {i + 1}
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  {t(`landing.howItWorks.${step.keyTitle}`)}
                </h3>
                <p className="text-muted leading-relaxed">
                  {t(`landing.howItWorks.${step.keyBody}`)}
                </p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
