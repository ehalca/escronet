"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";

const FEATURES = [
  {
    icon: "🛡️",
    key: "privacy",
    gradient: "from-blue-500/20 to-sky-500/10",
    border: "border-blue-500/20",
    iconBg: "bg-blue-500/20",
  },
  {
    icon: "⚡",
    key: "openSource",
    gradient: "from-purple-500/20 to-indigo-500/10",
    border: "border-purple-500/20",
    iconBg: "bg-purple-500/20",
    href: "https://github.com/escronet",
  },
  {
    icon: "💙",
    key: "free",
    gradient: "from-sky-500/20 to-cyan-500/10",
    border: "border-sky-500/20",
    iconBg: "bg-sky-500/20",
  },
] as const;

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.15 } },
};

const cardVariants = {
  hidden: { opacity: 0, y: 30 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.6, ease: "easeOut" } },
};

export function FeaturesSection() {
  const { t } = useTranslation();

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
          <h2 className="text-3xl sm:text-4xl font-bold text-white">
            {t("landing.features.title")}
          </h2>
        </motion.div>

        <motion.div
          variants={containerVariants}
          initial="hidden"
          whileInView="visible"
          viewport={{ once: true, margin: "-80px" }}
          className="grid grid-cols-1 md:grid-cols-3 gap-6"
        >
          {FEATURES.map((f) => (
            <motion.div
              key={f.key}
              variants={cardVariants}
              className={`relative rounded-2xl border ${f.border} bg-gradient-to-br ${f.gradient} p-6 flex flex-col gap-4 hover:scale-[1.02] transition-transform`}
            >
              <div className={`w-12 h-12 rounded-xl ${f.iconBg} flex items-center justify-center text-2xl`}>
                {f.icon}
              </div>
              <div>
                <h3 className="text-lg font-bold text-white mb-2">
                  {t(`landing.features.${f.key}.title`)}
                </h3>
                <p className="text-muted text-sm leading-relaxed">
                  {t(`landing.features.${f.key}.body`)}
                </p>
              </div>
              {"href" in f && (
                <a
                  href={f.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="mt-auto text-sm text-sky-400 hover:text-sky-300 font-medium"
                >
                  View on GitHub →
                </a>
              )}
            </motion.div>
          ))}
        </motion.div>
      </div>
    </section>
  );
}
