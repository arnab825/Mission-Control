import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/siteUrl";
import GamesTestedClient from "./GamesTestedClient";

export const metadata: Metadata = {
  title: "Tested Games & Performance Benchmarks — NVIDIA DLSS & Hardware Telemetry",
  description:
    "Real-world gaming benchmarks, verified DirectX 12/Vulkan profiles, NVIDIA DLSS & Frame Generation telemetry, and AI preset recommendations tested by Mission Control.",
  keywords: [
    "Tested Games Benchmarks",
    "DirectX 12 FPS Benchmarks",
    "NVIDIA DLSS Frame Generation Telemetry",
    "GPU Performance Audit",
    "Game Latency Benchmarks",
    "VRAM Allocation Tested Games",
    "Mission Control Verified Games",
  ],
  alternates: {
    canonical: `${getBaseUrl()}/games-tested`,
  },
  openGraph: {
    title: "Tested Games & Performance Benchmarks | Mission Control",
    description:
      "Real-world gaming benchmarks, NVIDIA DLSS telemetry, and hardware preset recommendations verified by Mission Control.",
    url: `${getBaseUrl()}/games-tested`,
    siteName: "Mission Control",
    images: [
      {
        url: `${getBaseUrl()}/images/og-benchmarks.png`,
        width: 1200,
        height: 630,
        alt: "Mission Control Tested Games & Telemetry Benchmarks",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Tested Games & Performance Benchmarks | Mission Control",
    description:
      "Real-world gaming benchmarks, NVIDIA DLSS telemetry, and hardware preset recommendations verified by Mission Control.",
    images: [`${getBaseUrl()}/images/og-benchmarks.png`],
  },
};

export default function GamesTestedPage() {
  return <GamesTestedClient />;
}
