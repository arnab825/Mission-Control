import { Metadata } from "next";
import { BASE_SITE_URL } from "@/lib/siteUrl";

export const metadata: Metadata = {
  title: "Contact Dispatch Gateway & Support | Mission Control",
  description:
    "Direct communication channel for bug reports, hardware telemetry feedback, feature requests, and partnership inquiries with the Mission Control team.",
  alternates: {
    canonical: `${BASE_SITE_URL}/contact`,
  },
  openGraph: {
    title: "Contact Dispatch Gateway & Support | Mission Control",
    description:
      "Direct communication channel for bug reports, hardware telemetry feedback, and partnership inquiries.",
    url: `${BASE_SITE_URL}/contact`,
    siteName: "Mission Control",
    type: "website",
    images: [
      {
        url: `${BASE_SITE_URL}/logo.png`,
        width: 1024,
        height: 1024,
        alt: "Mission Control Support Dispatch",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Contact Dispatch Gateway & Support | Mission Control",
    description: "Get in touch with the Mission Control development team.",
    images: [`${BASE_SITE_URL}/logo.png`],
  },
};

export default function ContactLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
