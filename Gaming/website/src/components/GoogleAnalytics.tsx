"use client";

import Script from "next/script";

interface GoogleAnalyticsProps {
  gaId?: string;
}

export function GoogleAnalyticsScript({ gaId }: GoogleAnalyticsProps) {
  const trackingId = gaId || process.env.NEXT_PUBLIC_GA_TRACKING_ID;

  if (!trackingId) return null;

  return (
    <>
      <Script
        strategy="afterInteractive"
        src={`https://www.googletagmanager.com/gtag/js?id=${trackingId}`}
      />
      <Script
        id="google-analytics-gtag"
        strategy="afterInteractive"
        dangerouslySetInnerHTML={{
          __html: `
            window.dataLayer = window.dataLayer || [];
            function gtag(){dataLayer.push(arguments);}
            gtag('js', new Date());
            gtag('config', '${trackingId}', {
              page_path: window.location.pathname,
            });
          `,
        }}
      />
    </>
  );
}
