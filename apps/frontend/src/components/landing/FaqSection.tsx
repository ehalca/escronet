"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const FAQ_COUNT = 8;

export function FaqSection() {
  const { t } = useTranslation();
  const [open, setOpen] = useState<number | null>(null);

  return (
    <section className="py-24 px-6 bg-navy-800/40">
      <div className="max-w-3xl mx-auto">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-80px" }}
          transition={{ duration: 0.6 }}
          className="text-center mb-12"
        >
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {t("landing.faq.title")}
          </h2>
        </motion.div>

        <div className="flex flex-col gap-3">
          {Array.from({ length: FAQ_COUNT }, (_, i) => i + 1).map((n) => {
            const isOpen = open === n;
            return (
              <motion.div
                key={n}
                initial={{ opacity: 0, y: 10 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, margin: "-40px" }}
                transition={{ duration: 0.4, delay: (n - 1) * 0.05 }}
                className="rounded-2xl border border-navy-700 bg-navy-800/60 overflow-hidden"
              >
                <button
                  onClick={() => setOpen(isOpen ? null : n)}
                  className="w-full flex items-center justify-between px-5 py-4 text-left"
                >
                  <span className="text-white font-medium pr-4">
                    {t(`landing.faq.q${n}`)}
                  </span>
                  <motion.span
                    animate={{ rotate: isOpen ? 45 : 0 }}
                    transition={{ duration: 0.2 }}
                    className="text-sky-400 text-xl flex-shrink-0"
                  >
                    +
                  </motion.span>
                </button>

                <AnimatePresence initial={false}>
                  {isOpen && (
                    <motion.div
                      key="content"
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: "auto", opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.3, ease: "easeInOut" }}
                      className="overflow-hidden"
                    >
                      <p className="px-5 pb-5 text-muted leading-relaxed text-sm">
                        {t(`landing.faq.a${n}`)}
                      </p>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
