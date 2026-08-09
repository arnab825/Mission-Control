import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";
import { GoogleAdSenseScript } from "@/components/GoogleAdSense";
import { GoogleAnalyticsScript } from "@/components/GoogleAnalytics";

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

export const metadata: Metadata = {
  metadataBase: new URL("https://mission-control-roan-seven.vercel.app"),
  title: {
    default: "Mission Control — Autonomous AI Gaming Assistant & Telemetry Overlay",
    template: "%s | Mission Control"
  },
  description: "Mission Control is an advanced agentic AI gaming overlay, telemetry control dashboard, and technical coach. Optimize GPU performance, frame rates, and telemetry hotfixes.",
  keywords: [
    "mission control gaming ai",
    "mission control gaming",
    "mission control ai",
    "mission control",
    "gaming overlay",
    "Mission Control Gaming AI",
    "Mission Control Gaming",
    "Mission Control AI",
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
              "@type": "WebSite",
              "name": "Mission Control",
              "url": "https://mission-control-roan-seven.vercel.app",
              "potentialAction": {
                "@type": "SearchAction",
                "target": "https://mission-control-roan-seven.vercel.app/blog?search={search_term_string}",
                "query-input": "required name=search_term_string"
              }
            })
          }}
        />

        {/* Software Application Schema */}
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Mission Control",
              "operatingSystem": "Windows 10, Windows 11",
              "applicationCategory": "GameApplication, UtilityApplication",
              "offers": {
                "@type": "Offer",
                "price": "0.00",
                "priceCurrency": "USD"
              },
              "description": "An advanced AI-powered gaming assistant, overlay, and hardware diagnostic telemetry tool designed to optimize frame rates, cooling profiles, and apply community-sourced telemetry patches.",
              "featureList": [
                "Real-time DirectX HUD overlay",
                "AI Agentic Auto-Play Co-pilot",
                "Physical WMI and NVML GPU/CPU telemetry logging",
                "Community-voted hardware conflict and hotfix repository"
              ]
            })
          }}
        />

        <ClientLayout>
          {children}
        </ClientLayout>
      </body>
    </html>
  );
}
