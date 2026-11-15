import type { Metadata } from "next";
import { getBaseUrl } from "@/lib/siteUrl";
import ContactClient from "./ContactClient";

export const metadata: Metadata = {
  title: "Contact & Developer Support Dispatch — Mission Control",
  description:
    "Direct developer dispatch gateway for Mission Control bug reports, GPU telemetry crash logs, custom hardware hooks, and sponsorship inquiries.",
  keywords: [
    "Contact Mission Control",
    "GPU Telemetry Support",
    "Bug Dispatch Gateway",
    "Developer Inquiries Gaming AI",
    "Mission Control Discord Support",
  ],
  alternates: {
    canonical: `${getBaseUrl()}/contact`,
  },
  openGraph: {
    title: "Contact & Developer Support Dispatch | Mission Control",
    description:
      "Direct developer dispatch gateway for Mission Control bug reports, telemetry logs, and inquiries.",
    url: `${getBaseUrl()}/contact`,
    siteName: "Mission Control",
    images: [
      {
        url: `${getBaseUrl()}/images/og-contact.png`,
        width: 1200,
        height: 630,
        alt: "Mission Control Contact & Support Terminal",
      },
    ],
    locale: "en_US",
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact & Developer Support Dispatch | Mission Control",
    description:
      "Direct developer dispatch gateway for Mission Control bug reports, telemetry logs, and inquiries.",
    images: [`${getBaseUrl()}/images/og-contact.png`],
  },
};

export default function ContactPage() {
  return <ContactClient />;
}
