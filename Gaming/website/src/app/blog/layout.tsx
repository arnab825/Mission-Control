import { Metadata } from "next";
import { BASE_SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Gaming Intel & Hardware News | Mission Control",
  description:
    "Daily AI-curated technical breakdowns, GPU architecture analysis, game updates, and deep-dive telemetry reports.",
  alternates: {
    canonical: `${BASE_SITE_URL}/blog`,
  },
  openGraph: {
    title: "Gaming Intel & Hardware News | Mission Control",
    description:
      "Daily AI-curated technical breakdowns, GPU architecture analysis, game updates, and deep-dive telemetry reports.",
    url: `${BASE_SITE_URL}/blog`,
    siteName: "Mission Control",
    images: [
      {
        url: `${BASE_SITE_URL}/og-image.png`,
        width: 1200,
        height: 630,
        alt: "Mission Control Gaming Intel",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Gaming Intel & Hardware News | Mission Control",
    description:
      "Daily AI-curated technical breakdowns, GPU architecture analysis, and game telemetry reports.",
    images: [`${BASE_SITE_URL}/og-image.png`],
  },
};

export default function BlogLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
