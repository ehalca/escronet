import type { MetadataRoute } from "next";
import { SUPPORTED_LANGUAGES } from "@escronet/i18n";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://escronet.com").replace(/\/$/, "");

const PAGES: { path: string; changeFrequency: MetadataRoute.Sitemap[0]["changeFrequency"]; priority: number }[] = [
  { path: "/",            changeFrequency: "weekly",  priority: 1.0 },
  { path: "/privacy",     changeFrequency: "monthly", priority: 0.5 },
  { path: "/permissions", changeFrequency: "monthly", priority: 0.6 },
];

function pageUrl(lang: string, path: string): string {
  const prefix = lang === "en" ? "" : `/${lang}`;
  return path === "/" ? `${BASE}${prefix || "/"}` : `${BASE}${prefix}${path}`;
}

export default function sitemap(): MetadataRoute.Sitemap {
  return PAGES.map(({ path, changeFrequency, priority }) => ({
    url: pageUrl("en", path),
    lastModified: new Date(),
    changeFrequency,
    priority,
    alternates: {
      languages: Object.fromEntries(
        SUPPORTED_LANGUAGES.map((lang) => [lang, pageUrl(lang, path)])
      ),
    },
  }));
}
