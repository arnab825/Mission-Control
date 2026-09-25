"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { TestedGameSummary, getLiveTestedGames, fetchBenchmarks } from "@/data/benchmarks";
import {
  HeroSection,
  TechPartnersTicker,
  VerifiedTestedGamesSection,
  HardwareSuiteBentoSection,
  ScreenshotGallerySection,
  BeforeAfterSection,
  InteractiveHudSection,
  PerformanceComparisonSection,
  DownloadSection,
  FaqSection,
  OS,
} from "@/components/home";

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

export default function Home() {
  const [os, setOs] = useState<OS>(null);
  const [appVersion, setAppVersion] = useState("3.6.1");
  const [testedGames, setTestedGames] = useState<TestedGameSummary[]>(getLiveTestedGames());

  useEffect(() => {
    let isMounted = true;
    const ua = (
      (typeof window !== "undefined" && (window.navigator.userAgent || window.navigator.platform)) || ""
    ).toLowerCase();
    if (ua.includes("win")) setOs("windows");
    else if (ua.includes("linux") || ua.includes("x11")) setOs("linux");
    else if (ua.includes("mac")) setOs("mac");
    else setOs("other");

    fetch("/api/version")
      .then((res) => res.json())
      .then((data) => {
        if (isMounted && data?.version) setAppVersion(data.version);
      })
      .catch(() => {});

    fetchBenchmarks()
      .then((data) => {
        if (isMounted && data.testedGames && data.testedGames.length > 0) {
          setTestedGames(data.testedGames);
        }
      })
      .catch(() => {});

    return () => {
      isMounted = false;
    };
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start w-full relative overflow-hidden pt-20 sm:pt-24 bg-obsidian text-white">
      {/* JSON-LD Schemas */}
      <Script id="faq-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(faqSchema) }} />
      <Script id="software-schema" type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(softwareSchema) }} />

      {/* Background Cybernetic Grid & Ambient Aurora Spotlights */}
      <div className="absolute inset-0 cyber-grid opacity-20 pointer-events-none z-0" />
      <div className="absolute inset-0 cyber-dots opacity-15 pointer-events-none z-0" />

      {/* Multi-Stop Radiant Gradient Ambient Orbs */}
      <div className="absolute top-[-12%] left-1/2 -translate-x-1/2 w-175 sm:w-300 h-125 sm:h-175 bg-linear-to-b from-neon-green/20 via-emerald-500/10 to-transparent rounded-full blur-[160px] pointer-events-none z-0 animate-pulse-slow" />
      <div className="absolute top-[15%] left-[-10%] w-96 sm:w-125 h-96 sm:h-125 bg-linear-to-tr from-cyan-500/15 to-transparent rounded-full blur-[140px] pointer-events-none z-0 animate-aura-float" />
      <div className="absolute top-[35%] right-[-10%] w-110 sm:w-150 h-110 sm:h-150 bg-linear-to-bl from-purple-600/12 via-neon-yellow/5 to-transparent rounded-full blur-[180px] pointer-events-none z-0" />

      {/* Modular Landing Page Sections */}
      <HeroSection os={os} appVersion={appVersion} />
      <TechPartnersTicker />
      <VerifiedTestedGamesSection testedGames={testedGames} />
      <HardwareSuiteBentoSection />
      <ScreenshotGallerySection />
      <BeforeAfterSection />
      <InteractiveHudSection />
      <PerformanceComparisonSection />
      <DownloadSection />
      <FaqSection />
    </div>
  );
}
