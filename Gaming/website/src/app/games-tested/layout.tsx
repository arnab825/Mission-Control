import { Metadata } from "next";
import { BASE_SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Tested Games & GPU Benchmark Database | Mission Control",
  description:
    "Explore verified FPS benchmarks, latency telemetry, DLSS/FSR presets, and real-time optimization profiles across 50+ modern AAA PC titles.",
  alternates: {
    canonical: `${BASE_SITE_URL}/games-tested`,
  },
  openGraph: {
    title: "Tested Games & GPU Benchmark Database | Mission Control",
    description:
      "Explore verified FPS benchmarks, latency telemetry, DLSS/FSR presets, and real-time optimization profiles.",
    url: `${BASE_SITE_URL}/games-tested`,
    siteName: "Mission Control",
    images: [
      {
        url: `${BASE_SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Mission Control Tested Games Database",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tested Games & GPU Benchmark Database | Mission Control",
    description:
      "Explore verified FPS benchmarks, latency telemetry, and PC gaming optimization profiles.",
    images: [`${BASE_SITE_URL}/og-image.png`],
  },
};

export default function GamesTestedLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
