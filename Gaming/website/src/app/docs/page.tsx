import type { Metadata } from "next";
import { getAllDocs } from "@/lib/docs";
import DocsClient from "./DocsClient";
import { BASE_SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Documentation & Developer Guides | Mission Control",
  description:
    "Complete documentation, API specifications, quickstart installation guides, and keyboard shortcuts for Mission Control Gaming AI.",
  keywords: [
    "Mission Control documentation",
    "gaming assistant guides",
    "DirectX overlay setup",
    "Mission Control quickstart",
    "GPU telemetry manual",
  ],
  alternates: {
    canonical: `${BASE_SITE_URL}/docs`,
  },
  openGraph: {
    title: "Documentation & Developer Guides | Mission Control",
    description:
      "Complete documentation, API specifications, and installation guides for Mission Control Gaming AI.",
    url: `${BASE_SITE_URL}/docs`,
    siteName: "Mission Control",
    type: "website",
    images: [
      {
        url: `${BASE_SITE_URL}/logo.png`,
        width: 1024,
        height: 1024,
        alt: "Mission Control Documentation",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Documentation & Developer Guides | Mission Control",
    description: "Complete documentation and guides for Mission Control Gaming AI.",
    images: [`${BASE_SITE_URL}/logo.png`],
  },
};

export default async function DocsPage() {
  const docs = await getAllDocs();
  return <DocsClient docs={docs} />;
}
