"use client";

import { motion } from "framer-motion";
import { useTranslation } from "react-i18next";
import { ShieldIcon } from "./ShieldIcon";

function CodeIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="16 18 22 12 16 6" />
      <polyline points="8 6 2 12 8 18" />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

const FEATURES = [
  {
    icon: "shield",
    key: "privacy",
    gradient: "from-blue-500/20 to-sky-500/10",
    border: "border-blue-500/20",
    iconBg: "bg-blue-500/15",
    iconColor: "",
  },
  {
    icon: "code",
    key: "openSource",
    gradient: "from-purple-500/20 to-indigo-500/10",
    border: "border-purple-500/20",
    iconBg: "bg-purple-500/15",
    iconColor: "text-purple-400",
    href: "https://github.com/escronet",
  },
  {
    icon: "heart",
    key: "free",
    gradient: "from-sky-500/20 to-cyan-500/10",
    border: "border-sky-500/20",
    iconBg: "bg-sky-500/15",
    iconColor: "text-sky-400",
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

function FeatureIcon({ icon, iconBg, iconColor }: { icon: string; iconBg: string; iconColor: string }) {
  return (
    <div className={`w-12 h-12 rounded-xl ${iconBg} flex items-center justify-center ${iconColor}`}>
      {icon === "shield" && <ShieldIcon size={26} />}
      {icon === "code" && <CodeIcon />}
      {icon === "heart" && <HeartIcon />}
    </div>
  );
}

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
              className={`relative rounded-2xl border ${f.border} bg-linear-to-br ${f.gradient} p-6 flex flex-col gap-4 hover:scale-[1.02] transition-transform`}
            >
              <FeatureIcon icon={f.icon} iconBg={f.iconBg} iconColor={f.iconColor} />
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
