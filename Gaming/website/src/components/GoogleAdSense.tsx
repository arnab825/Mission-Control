"use client";

import React, { useEffect, useRef } from "react";

interface GoogleAdSenseProps {
  publisherId?: string;
}

export function GoogleAdSenseScript({ publisherId }: GoogleAdSenseProps) {
  const client = publisherId || process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;

  useEffect(() => {
    if (!client) return;
    if (document.querySelector('script[src*="adsbygoogle.js"]')) return;

    const script = document.createElement("script");
    script.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${client}`;
    script.async = true;
    script.crossOrigin = "anonymous";
    document.head.appendChild(script);
  }, [client]);

  return null;
}

interface AdSlotProps {
  slotId?: string;
  format?: "auto" | "fluid" | "rectangle";
  responsive?: boolean;
  className?: string;
}

export function AdSenseAdSlot({
  slotId = "3942234105",
  format = "auto",
  responsive = true,
  className = "my-6 w-full flex justify-center min-h-[90px]"
}: AdSlotProps) {
  const publisherId = process.env.NEXT_PUBLIC_ADSENSE_CLIENT_ID;
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (typeof window === "undefined" || !publisherId) return;

    const timer = setTimeout(() => {
      try {
        const insElement = containerRef.current?.querySelector("ins.adsbygoogle");
        if (
          insElement &&
          !insElement.getAttribute("data-ad-status") &&
          !insElement.getAttribute("data-adsbygoogle-status") &&
          insElement.children.length === 0
        ) {
          // @ts-ignore
          (window.adsbygoogle = window.adsbygoogle || []).push({});
        }
      } catch (err) {
        console.warn("AdSense push error:", err);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [publisherId]);

  if (!publisherId) {
    return (
      <div className={`${className} p-4 rounded-2xl bg-white/[0.02] border border-dashed border-neon-green/30 font-mono text-xs text-gray-400 text-center flex flex-col items-center justify-center gap-1.5 backdrop-blur-sm min-h-[100px]`}>
        <span className="text-neon-green font-bold uppercase text-[10px] tracking-wider">⚡ GOOGLE ADSENSE READY SLOT</span>
        <span className="text-[11px] text-gray-300">Set <code className="text-neon-yellow">NEXT_PUBLIC_ADSENSE_CLIENT_ID</code> in environment to activate live Google ads.</span>
      </div>
    );
  }

  return (
    <div ref={containerRef} className={className}>
      <ins
        className="adsbygoogle"
        style={{ display: "block", width: "100%", minHeight: "90px" }}
        data-ad-client={publisherId}
        data-ad-slot={slotId}
        data-ad-format={format}
        data-full-width-responsive={responsive ? "true" : "false"}
      />
    </div>
  );
}


