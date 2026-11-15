import type { Metadata } from "next";
import Script from "next/script";
import { getBaseUrl } from "@/lib/siteUrl";
import HomeClient from "./HomeClient";

export const metadata: Metadata = {
  title: "Mission Control — AI-Powered Gaming Assistant & Real-Time Performance Suite",
  description:
    "Autonomous PC gaming assistant, real-time DirectX telemetry overlay, and GPU optimization dashboard with neural presets, zero-latency HUD, and MUX switch routing.",
  alternates: {
    canonical: `${getBaseUrl()}/`,
  },
  openGraph: {
    title: "Mission Control — AI-Powered Gaming Assistant",
    description:
      "Autonomous PC gaming assistant, real-time DirectX telemetry overlay, and GPU optimization dashboard.",
    url: `${getBaseUrl()}/`,
    siteName: "Mission Control",
    images: [
      {
        url: `${getBaseUrl()}/images/og-card.png`,
        width: 1200,
        height: 630,
        alt: "Mission Control HUD & Telemetry Interface",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Mission Control — AI-Powered Gaming Assistant",
    description:
      "Autonomous PC gaming assistant, real-time DirectX telemetry overlay, and GPU optimization dashboard.",
    images: [`${getBaseUrl()}/images/og-card.png`],
  },
};

const faqSchema = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "What hardware do I need?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Mission Control strictly requires an NVIDIA GTX or RTX graphics card to run its powerful AI models locally for zero latency.",
      },
    },
    {
      "@type": "Question",
      name: "Is Mission Control free?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Yes! Mission Control is 100% free and open-source. Anyone can contribute on GitHub.",
      },
    },
    {
      "@type": "Question",
      name: "Will this get me banned in multiplayer games?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Mission Control operates as a standard transparent overlay (similar to Steam or Discord overlays). However, agentic macros in competitive multiplayer are used at your own risk.",
      },
    },
  ],
};

const softwareSchema = {
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  name: "Mission Control",
  operatingSystem: "Windows, Linux",
  applicationCategory: "GameApplication",
};

export default function Page() {
  return (
    <>
      <Script
        id="faq-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }}
      />
      <Script
        id="software-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }}
      />
      <HomeClient />
    </>
  );
}
