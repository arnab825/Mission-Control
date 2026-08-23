import type { Metadata, Viewport } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { GoogleAdSenseScript } from "@/components/GoogleAdSense";
import { GoogleAnalyticsScript } from "@/components/GoogleAnalytics";
import { Analytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { BASE_SITE_URL } from "@/lib/siteUrl";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

const outfit = Outfit({
  variable: "--font-outfit",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0a0a0c",
};

export const metadata: Metadata = {
  metadataBase: new URL(BASE_SITE_URL),
  title: {
    default: "Mission Control Gaming AI — Autonomous Assistant & Telemetry Overlay",
    template: "%s | Mission Control Gaming AI"
  },
  description: "Mission Control Gaming AI is an autonomous PC gaming assistant, real-time DirectX telemetry overlay, and GPU optimization dashboard powered by NVIDIA NIM.",
  keywords: [
    "mission control gaming ai",
    "mission control gaming",
    "mission control ai",
    "mission control",
    "Mission Control Gaming AI",
    "Mission Control Gaming",
    "Mission Control AI",
    "gaming overlay",
    "AI Gaming Assistant",
    "Mission Control App",
    "Mission Control Overlay",
    "Mission Control Vercel",
    "AI Gaming Assistant",
    "Gaming Telemetry Control",
    "NVIDIA NIM Gaming",
    "DirectX 12 FPS Engine",
    "GPU Telemetry Dashboard",
    "HUD Overlay Gaming",
    "DirectX Overlay Jitter Fix",
    "Community Hotfix Tracker",
    "System Performance Optimizer",
    "PC Gaming Optimization AI",
    "GPU FPS Monitor Overlay",
    "Game Benchmark Diagnostics",
    "Hardware Telemetry Logger",
    "Autonomous Gaming Co-Pilot"
  ],
  authors: [{ name: "Mission Control Team" }],
  icons: {
    icon: [
      { url: "/logo.png", type: "image/png" },
      { url: "/favicon.ico", sizes: "any" }
    ],
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  alternates: {
    canonical: "/",
  },
  verification: {
    google: process.env.NEXT_PUBLIC_GOOGLE_SITE_VERIFICATION || "",
  },
  other: {
    "google-adsense-account": process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID || "",
  },
  openGraph: {
    title: "Mission Control - Autonomous Gaming Assistant & Telemetry Control",
    description: "Advanced agentic HUD overlay, technical coach, and hardware performance diagnostics optimized by NVIDIA NIM.",
    url: "https://mission-control-roan-seven.vercel.app",
    siteName: "Mission Control",
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mission Control - Autonomous Gaming Assistant",
    description: "Real-time AI overlay, telemetry logs, and community hotfixes.",
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      data-scroll-behavior="smooth"
      className={`${inter.variable} ${jetbrainsMono.variable} ${outfit.variable} antialiased dark`}
    >
      <body className="min-h-screen flex flex-col bg-obsidian text-foreground font-sans">
        <GoogleAnalyticsScript />
        <GoogleAdSenseScript />

        {/* Google Search Sitelinks & WebSite SearchAction Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@graph": [
                {
                  "@type": "WebSite",
                  "@id": `${BASE_SITE_URL}/#website`,
                  "name": "Mission Control Gaming",
                  "alternateName": ["Mission Control AI", "Mission Control", "MissionControl GG"],
                  "url": BASE_SITE_URL,
                  "potentialAction": {
                    "@type": "SearchAction",
                    "target": `${BASE_SITE_URL}/blog?search={search_term_string}`,
                    "query-input": "required name=search_term_string"
                  }
                },
                {
                  "@type": "Organization",
                  "@id": `${BASE_SITE_URL}/#organization`,
                  "name": "Mission Control Gaming",
                  "url": BASE_SITE_URL,
                  "logo": `${BASE_SITE_URL}/logo.png`,
                  "description": "Autonomous AI gaming telemetry, DirectX HUD overlay, and real-time PC performance assistant.",
                  "sameAs": [
                    "https://github.com/arnab825/Mission-Control"
                  ]
                },
                {
                  "@type": "SoftwareApplication",
                  "@id": `${BASE_SITE_URL}/#software`,
                  "name": "Mission Control Gaming AI",
                  "operatingSystem": "Windows 10, Windows 11, Linux",
                  "applicationCategory": "GameApplication, UtilityApplication",
                  "offers": {
                    "@type": "Offer",
                    "price": "0.00",
                    "priceCurrency": "USD"
                  },
                  "description": "Autonomous AI gaming assistant, DirectX 12 telemetry overlay, and hardware diagnostic optimizer.",
                  "featureList": [
                    "Real-time DirectX HUD overlay",
                    "AI Agentic Auto-Play Co-pilot",
                    "Physical WMI and NVML GPU/CPU telemetry logging",
                    "Community-voted hardware conflict and hotfix repository"
                  ]
                }
              ]
            })
          }}
        />

        <ClientLayout>
          {children}
        </ClientLayout>
        <Analytics />
        <SpeedInsights />
      </body>
    </html>
  );
}
