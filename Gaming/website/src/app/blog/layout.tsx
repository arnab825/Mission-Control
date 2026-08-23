import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Gaming Intel & Hardware News | Mission Control",
  description:
    "Daily AI-curated technical breakdowns, GPU architecture analysis, game updates, and deep-dive telemetry reports.",
  alternates: {
    canonical: "https://mission-control-roan-seven.vercel.app/blog",
  },
  openGraph: {
    title: "Gaming Intel & Hardware News | Mission Control",
    description:
      "Daily AI-curated technical breakdowns, GPU architecture analysis, game updates, and deep-dive telemetry reports.",
    url: "https://mission-control-roan-seven.vercel.app/blog",
    siteName: "Mission Control",
    images: [
      {
        url: "https://mission-control-roan-seven.vercel.app/og-image.png",
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
    images: ["https://mission-control-roan-seven.vercel.app/og-image.png"],
  },
};

export default function BlogLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
