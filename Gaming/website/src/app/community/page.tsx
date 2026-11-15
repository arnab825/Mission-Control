import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/siteUrl";
import CommunityClient from "./CommunityClient";

export const metadata: Metadata = {
  title: "Community Intel Hub & Hardware Glitch Tracker — Player Rig Telemetry",
  description:
    "Explore community game reviews, compare player GPU rig benchmarks, and report or verify driver rendering faults and hardware conflicts in Mission Control.",
  keywords: [
    "Community Game Ratings",
    "Player Rig Benchmarks",
    "Hardware Glitch Tracker",
    "GPU Driver Conflict Fixes",
    "Mission Control Community Intel",
    "DirectX 12 Crash Reports",
    "Crowdsourced Game Telemetry",
  ],
  alternates: {
    canonical: `${getBaseUrl()}/community`,
  },
  openGraph: {
    title: "Community Intel Hub & Hardware Glitch Tracker | Mission Control",
    description:
      "Explore community game reviews, compare player GPU rig benchmarks, and report or verify driver rendering faults.",
    url: `${getBaseUrl()}/community`,
    siteName: "Mission Control",
    images: [
      {
        url: `${getBaseUrl()}/images/og-community.png`,
        width: 1200,
        height: 630,
        alt: "Mission Control Community Intel & Rig Telemetry Hub",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Community Intel Hub & Hardware Glitch Tracker | Mission Control",
    description:
      "Explore community game reviews, compare player GPU rig benchmarks, and report driver rendering faults.",
    images: [`${getBaseUrl()}/images/og-community.png`],
  },
};

export default function CommunityPage() {
  return <CommunityClient />;
}
