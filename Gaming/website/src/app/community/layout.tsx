import { Metadata } from "next";
import { BASE_SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Community Hotfix Tracker & Hardware Glitch Reports | Mission Control",
  description:
    "Community-voted DirectX crash hotfixes, GPU driver incompatibilities, stutter fixes, and hardware resolution guides submitted and verified by PC gamers.",
  keywords: [
    "gaming community hotfixes",
    "DirectX crash fix",
    "GPU driver incompatibility",
    "PC gaming stutter fix",
    "game crash solution",
    "community glitch reports",
    "Mission Control community",
  ],
  alternates: {
    canonical: `${BASE_SITE_URL}/community`,
  },
  openGraph: {
    title: "Community Hotfix Tracker & Hardware Glitch Reports | Mission Control",
    description:
      "Community-voted DirectX crash hotfixes, GPU driver incompatibilities, and stutter solutions verified by PC gamers.",
    url: `${BASE_SITE_URL}/community`,
    siteName: "Mission Control",
    type: "website",
    images: [
      {
        url: `${BASE_SITE_URL}/logo.png`,
        width: 1024,
        height: 1024,
        alt: "Mission Control Community Hotfix Tracker",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Community Hotfix Tracker & Hardware Glitch Reports | Mission Control",
    description:
      "Community-voted DirectX crash hotfixes and hardware resolution guides.",
    images: [`${BASE_SITE_URL}/logo.png`],
  },
};

export default function CommunityLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
