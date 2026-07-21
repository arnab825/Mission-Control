import type { Metadata } from "next";
import { Inter, JetBrains_Mono, Outfit } from "next/font/google";
import "./globals.css";
import ClientLayout from "@/components/ClientLayout";

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
  title: {
    default: "Mission Control - Autonomous Gaming Assistant & Telemetry Control",
    template: "%s | Mission Control Mission Control"
  },
  description: "Mission Control is an advanced agentic gaming overlay, technical coach, and hardware telemetry dashboard. Optimize your GPU performance, track real-time frame rates, and synchronize community telemetry hotfixes automatically.",
  keywords: [
    "AI Gaming Assistant", 
    "Mission Control", 
    "NVIDIA NIM", 
    "DirectX 12 FPS Engine", 
    "GPU Telemetry", 
    "HUD Overlay", 
    "DirectX Overlay Jitter", 
    "Community Hotfix Tracker", 
    "System Performance Optimizer"
  ],
  authors: [{ name: "Mission Control Team" }],
  openGraph: {
    title: "Mission Control - Autonomous Gaming Assistant & Telemetry Control",
    description: "Advanced agentic HUD overlay, technical coach, and hardware performance diagnostics optimized by NVIDIA NIM.",
    url: "https://aero-mission-control.dev",
    siteName: "Mission Control Mission Control",
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
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify({
              "@context": "https://schema.org",
              "@type": "SoftwareApplication",
              "name": "Mission Control Mission Control",
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
