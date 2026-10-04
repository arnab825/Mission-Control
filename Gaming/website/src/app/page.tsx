"use client";

import { useState, useEffect } from "react";
import Script from "next/script";
import { TestedGameSummary, getLiveTestedGames, fetchBenchmarks } from "@/data/benchmarks";
import { APP_VERSION } from "@/lib/version";
import dynamic from "next/dynamic";
import { HeroSection, OS } from "@/components/home/HeroSection";
import { TechPartnersTicker } from "@/components/home/TechPartnersTicker";

// Direct file dynamic imports enable genuine Next.js code-splitting and eliminate initial bundle bloat
const VerifiedTestedGamesSection = dynamic(
  () =>
    import("@/components/home/VerifiedTestedGamesSection").then(
      (m) => m.VerifiedTestedGamesSection
    )
);
const HardwareSuiteBentoSection = dynamic(
  () =>
    import("@/components/home/HardwareSuiteBentoSection").then(
      (m) => m.HardwareSuiteBentoSection
    )
);
const ScreenshotGallerySection = dynamic(
  () =>
    import("@/components/home/ScreenshotGallerySection").then(
      (m) => m.ScreenshotGallerySection
    )
);
const BeforeAfterSection = dynamic(
  () =>
    import("@/components/home/BeforeAfterSection").then(
      (m) => m.BeforeAfterSection
    )
);
const InteractiveHudSection = dynamic(
  () =>
    import("@/components/home/InteractiveHudSection").then(
      (m) => m.InteractiveHudSection
    )
);
const PerformanceComparisonSection = dynamic(
  () =>
    import("@/components/home/PerformanceComparisonSection").then(
      (m) => m.PerformanceComparisonSection
    )
);
const DownloadSection = dynamic(
  () =>
    import("@/components/home/DownloadSection").then(
      (m) => m.DownloadSection
    )
);
const FaqSection = dynamic(
  () =>
    import("@/components/home/FaqSection").then(
      (m) => m.FaqSection
    )
);

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
  const [appVersion, setAppVersion] = useState(APP_VERSION);
  const [testedGames, setTestedGames] = useState<TestedGameSummary[]>(getLiveTestedGames());

  useEffect(() => {
    let isMounted = true;
    const ua = (
      (typeof window !== "undefined" &&
        (window.navigator.userAgent || window.navigator.platform)) ||
      ""
    ).toLowerCase();
    // Detect OS immediately for responsive installer buttons
    if (ua.includes("win")) setOs("windows");
    else if (ua.includes("linux") || ua.includes("x11")) setOs("linux");
    else if (ua.includes("mac")) setOs("mac");
    else setOs("other");

    // Defer non-critical background data sync so it never competes with initial render or hero assets
    const scheduleFetch = () => {
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
    };

    if (typeof window !== "undefined" && "requestIdleCallback" in window) {
      const idleId = (window as any).requestIdleCallback(scheduleFetch, { timeout: 2000 });
      return () => {
        isMounted = false;
        (window as any).cancelIdleCallback(idleId);
      };
    } else {
      const timer = setTimeout(scheduleFetch, 800);
      return () => {
        isMounted = false;
        clearTimeout(timer);
      };
    }
  }, []);

  return (
    <div className="min-h-screen flex flex-col items-center justify-start w-full relative overflow-hidden pt-20 sm:pt-24 bg-obsidian text-white">
      {/* JSON-LD Schemas */}
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
