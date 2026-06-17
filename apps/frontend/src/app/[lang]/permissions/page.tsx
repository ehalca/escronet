"use client";

import { use, useState } from "react";
import { useTranslation } from "react-i18next";
import { NavBar } from "@/components/landing/NavBar";
import { Footer } from "@/components/landing/Footer";

const ANDROID_PERMS = ["p1", "p2", "p3", "p4", "p5", "p6"] as const;
const IOS_PERMS = ["p1"] as const;

type Platform = "android" | "ios";

function PermissionCard({
  nameKey,
  permKey,
  whyKey,
  privacyKey,
}: {
  nameKey: string;
  permKey: string;
  whyKey: string;
  privacyKey: string;
}) {
  const { t } = useTranslation();
  return (
    <div className="rounded-2xl border border-navy-700 bg-navy-800/60 p-5 flex flex-col gap-4">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-white font-semibold text-base">{t(nameKey)}</p>
          <p className="text-[11px] font-mono text-sky-400/80 mt-0.5">{t(permKey)}</p>
        </div>
        <span className="shrink-0 text-[10px] font-bold uppercase tracking-widest px-2 py-1 rounded-full border border-sky-400/30 text-sky-400 bg-sky-400/10 whitespace-nowrap">
          {t("landing.permissionsPage.permLabel")}
        </span>
      </div>

      <div>
        <p className="text-[11px] font-bold uppercase tracking-widest text-muted mb-1">
          {t("landing.permissionsPage.whyLabel")}
        </p>
        <p className="text-gray-300 text-sm leading-relaxed">{t(whyKey)}</p>
      </div>

      <div className="rounded-xl bg-green-900/20 border border-green-500/20 px-4 py-3 flex gap-2 items-start">
        <span className="text-green-400 mt-0.5 shrink-0">🔒</span>
        <div>
          <p className="text-[11px] font-bold uppercase tracking-widest text-green-400 mb-1">
            {t("landing.permissionsPage.privacyLabel")}
          </p>
          <p className="text-green-300/80 text-sm leading-relaxed">{t(privacyKey)}</p>
        </div>
      </div>
    </div>
  );
}

export default function PermissionsPage({
  params,
}: {
  params: Promise<{ lang: string }>;
}) {
  const { lang } = use(params);
  const { t } = useTranslation();
  const [tab, setTab] = useState<Platform>("android");

  return (
    <div className="min-h-screen bg-navy-900 text-white">
      <NavBar lang={lang} />

      <main className="max-w-3xl mx-auto px-6 pt-32 pb-24">
        <h1 className="text-4xl font-bold text-sky-400 mb-4">
          {t("landing.permissionsPage.title")}
        </h1>
        <p className="text-gray-300 leading-relaxed mb-8">
          {t("landing.permissionsPage.subtitle")}
        </p>

        {/* Privacy badge */}
        <div className="flex items-center gap-3 rounded-2xl border border-sky-400/20 bg-sky-400/5 px-5 py-4 mb-10">
          <span className="text-2xl shrink-0">🛡️</span>
          <p className="text-sky-300 text-sm leading-relaxed">
            {t("landing.permissionsPage.neverLeaves")}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-2 mb-10 border-b border-navy-700">
          {(["android", "ios"] as Platform[]).map((p) => (
            <button
              key={p}
              onClick={() => setTab(p)}
              className={`px-5 py-2.5 text-sm font-semibold transition-colors border-b-2 -mb-px ${
                tab === p
                  ? "border-sky-400 text-sky-400"
                  : "border-transparent text-muted hover:text-white"
              }`}
            >
              {t(`landing.permissionsPage.tab${p === "android" ? "Android" : "Ios"}`)}
            </button>
          ))}
        </div>

        {tab === "android" && (
          <div className="flex flex-col gap-4">
            <p className="text-gray-300 leading-relaxed mb-2">
              {t("landing.permissionsPage.androidIntro")}
            </p>
            {ANDROID_PERMS.map((p) => (
              <PermissionCard
                key={p}
                nameKey={`landing.permissionsPage.android.${p}name`}
                permKey={`landing.permissionsPage.android.${p}perm`}
                whyKey={`landing.permissionsPage.android.${p}why`}
                privacyKey={`landing.permissionsPage.android.${p}privacy`}
              />
            ))}
          </div>
        )}

        {tab === "ios" && (
          <div className="flex flex-col gap-4">
            <p className="text-gray-300 leading-relaxed mb-2">
              {t("landing.permissionsPage.iosIntro")}
            </p>
            {IOS_PERMS.map((p) => (
              <PermissionCard
                key={p}
                nameKey={`landing.permissionsPage.ios.${p}name`}
                permKey={`landing.permissionsPage.ios.${p}perm`}
                whyKey={`landing.permissionsPage.ios.${p}why`}
                privacyKey={`landing.permissionsPage.ios.${p}privacy`}
              />
            ))}
            <div className="rounded-2xl border border-yellow-500/20 bg-yellow-900/10 px-5 py-4 mt-2">
              <p className="text-yellow-300/80 text-sm leading-relaxed">
                ⚠️ {t("landing.permissionsPage.iosNote")}
              </p>
            </div>
          </div>
        )}
      </main>

      <Footer lang={lang} />
    </div>
  );
}
