import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const BASE = (process.env.NEXT_PUBLIC_SITE_URL ?? "https://escronet.com").replace(/\/$/, "");

const TITLE = "Escronet — Stop Scam Calls Before They Happen";
const DESCRIPTION =
  "On-device scam call detection. Transcribes audio with Whisper, classifies with ONNX, and alerts you instantly. Privacy first. Open source. Free.";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  metadataBase: new URL(BASE),
  title: {
    default: TITLE,
    template: "%s | Escronet",
  },
  description: DESCRIPTION,
  keywords: [
    "scam call detection",
    "call protection",
    "on-device AI",
    "scam prevention",
    "whisper transcription",
    "ONNX classifier",
    "privacy first",
    "open source",
  ],
  authors: [{ name: "Escronet", url: BASE }],
  creator: "Escronet",
  openGraph: {
    type: "website",
    url: BASE,
    siteName: "Escronet",
    title: TITLE,
    description: DESCRIPTION,
    images: [{ url: "/og-image.png", width: 1200, height: 630, alt: "Escronet" }],
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: TITLE,
    description: DESCRIPTION,
    images: ["/og-image.png"],
  },
  icons: {
    apple: "/apple-touch-icon.png",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: { index: true, follow: true, "max-image-preview": "large" },
  },
};

const jsonLd = {
  "@context": "https://schema.org",
  "@graph": [
    {
      "@type": "Organization",
      "@id": `${BASE}/#organization`,
      name: "Escronet",
      url: BASE,
      logo: { "@type": "ImageObject", url: `${BASE}/apple-touch-icon.png` },
      sameAs: ["https://github.com/escronet"],
    },
    {
      "@type": "WebSite",
      "@id": `${BASE}/#website`,
      url: BASE,
      name: "Escronet",
      publisher: { "@id": `${BASE}/#organization` },
      inLanguage: ["en", "ro", "ru"],
    },
    {
      "@type": "SoftwareApplication",
      name: "Escronet",
      operatingSystem: "Android",
      applicationCategory: "SecurityApplication",
      offers: { "@type": "Offer", price: "0", priceCurrency: "USD" },
      description: DESCRIPTION,
      url: BASE,
    },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <head>
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
        />
        <meta name="theme-color" content="#0D1B2A" />
      </head>
      <body className="min-h-full flex flex-col bg-navy-900 text-white">
        {children}
      </body>
    </html>
  );
}
