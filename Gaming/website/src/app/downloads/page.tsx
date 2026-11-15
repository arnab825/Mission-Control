import { Metadata } from "next";
import Link from "next/link";
import {
  Download,
  Monitor,
  Cpu,
  Layers,
  ShieldCheck,
  CheckCircle2,
  Terminal,
  Zap,
  ArrowRight,
  ChevronLeft,
} from "lucide-react";
import { BASE_SITE_URL } from "@/lib/siteUrl";
import { APP_VERSION } from "@/lib/version";
import {
  WINDOWS_INSTALLER_URL,
  WINDOWS_MSI_URL,
  WINDOWS_ZIP_URL,
  LINUX_APPIMAGE_URL,
  LINUX_DEB_URL,
  LINUX_TAR_URL,
  LINUX_RPM_URL,
} from "@/lib/download";

export const metadata: Metadata = {
  title: "Download Mission Control Gaming AI — Windows & Linux",
  description:
    "Download Mission Control Gaming AI standalone installer, portable archive, or native Linux package. Real-time telemetry, MUX switch routing, and NVIDIA NIM co-pilot.",
  alternates: {
    canonical: `${BASE_SITE_URL}/downloads`,
  },
  openGraph: {
    title: "Download Mission Control Gaming AI",
    description:
      "Get the latest standalone installers for Windows 10/11 and Linux. Real-time DirectX telemetry, MUX switch control, and AI gaming intelligence.",
    url: `${BASE_SITE_URL}/downloads`,
    siteName: "Mission Control",
    images: [
      {
        url: `${BASE_SITE_URL}/logo.png`,
        width: 1024,
        height: 1024,
        alt: "Mission Control Gaming AI Download",
      },
    ],
    type: "website",
  },
  twitter: {
    card: "summary_large_image",
    title: "Download Mission Control Gaming AI",
    description: "Installers for Windows 10/11 and Linux (AppImage, deb, rpm).",
    images: [`${BASE_SITE_URL}/logo.png`],
  },
};

export default function DownloadsPage() {
  const structuredData = {
    "@context": "https://schema.org",
    "@type": "SoftwareApplication",
    name: "Mission Control Gaming AI",
    operatingSystem: "Windows 10, Windows 11, Linux",
    applicationCategory: "GameApplication, UtilityApplication",
    softwareVersion: APP_VERSION,
    downloadUrl: WINDOWS_INSTALLER_URL,
    offers: {
      "@type": "Offer",
      price: "0.00",
      priceCurrency: "USD",
    },
  };

  return (
    <div className="min-h-screen bg-obsidian text-white pt-24 sm:pt-32 pb-20 px-4 sm:px-6 relative overflow-hidden font-sans">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />

      {/* Ambient background glow */}
      <div className="absolute top-[-10%] left-1/2 -translate-x-1/2 w-175 sm:w-250 h-100 bg-linear-to-b from-neon-green/15 via-emerald-500/5 to-transparent rounded-full blur-[140px] pointer-events-none z-0" />

      <div className="max-w-5xl mx-auto relative z-10">
        {/* Back Link */}
        <Link
          href="/"
          className="inline-flex items-center gap-2 text-xs font-mono text-gray-400 hover:text-neon-green mb-8 transition-colors bg-white/5 border border-white/10 px-3.5 py-1.5 rounded-xl backdrop-blur-md"
        >
          <ChevronLeft className="w-4 h-4" />
          <span>Return to Dashboard</span>
        </Link>

        {/* Hero Header */}
        <div className="text-center mb-12 sm:mb-16">
          <div className="inline-block border border-neon-green/30 rounded-full px-4 py-1.5 bg-neon-green/10 mb-4 backdrop-blur-md">
            <span className="text-neon-green text-xs font-bold font-mono tracking-widest uppercase">
              VERSION {APP_VERSION} PRODUCTION
            </span>
          </div>
          <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black mb-4 font-display uppercase tracking-tight text-white">
            DOWNLOAD <span className="text-neon-green glow-text-teal">MISSION CONTROL</span>
          </h1>
          <p className="text-gray-400 text-sm sm:text-lg max-w-2xl mx-auto leading-relaxed">
            Get the standalone installer, enterprise MSI, or portable archive for Windows and Linux.
            Zero cloud requirement for core hardware telemetry and local game library discovery.
          </p>
        </div>

        {/* Platform Download Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 sm:gap-8 mb-16">
          {/* Windows Package Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-neon-green/30 bg-obsidian/90 relative overflow-hidden flex flex-col justify-between shadow-[0_0_40px_rgba(118,185,0,0.15)]">
            <div className="absolute top-0 right-0 bg-neon-green text-obsidian text-[10px] font-mono font-black px-4 py-1 rounded-bl-xl uppercase tracking-wider">
              RECOMMENDED
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-neon-green/10 border border-neon-green/30 flex items-center justify-center text-neon-green">
                  <Monitor className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black font-display text-white">Windows</h2>
                  <p className="text-xs text-gray-400 font-mono">Windows 10 / 11 (64-bit)</p>
                </div>
              </div>
              <ul className="space-y-2 mb-8 text-xs text-gray-300 font-sans">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0" />
                  <span>DirectX 11/12 Low-Latency HUD Telemetry Hook</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0" />
                  <span>Alienware & ASUS GPU MUX Switch Control</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-neon-green shrink-0" />
                  <span>Dual GPU (iGPU + dGPU) Energy Switching</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <a
                href={WINDOWS_INSTALLER_URL}
                className="w-full btn-premium-primary py-3.5 px-6 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 font-mono shadow-[0_0_20px_rgba(118,185,0,0.35)]"
              >
                <Download className="w-4 h-4" />
                <span>Download Setup (.exe)</span>
              </a>
              <div className="grid grid-cols-2 gap-2 text-center text-xs font-mono">
                <a
                  href={WINDOWS_MSI_URL}
                  className="py-2 px-3 rounded-lg bg-white/5 border border-white/10 hover:border-neon-green/40 hover:text-neon-green transition-all"
                >
                  Enterprise (.msi)
                </a>
                <a
                  href={WINDOWS_ZIP_URL}
                  className="py-2 px-3 rounded-lg bg-white/5 border border-white/10 hover:border-neon-green/40 hover:text-neon-green transition-all"
                >
                  Portable (.zip)
                </a>
              </div>
            </div>
          </div>

          {/* Linux Package Card */}
          <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-white/10 bg-obsidian/90 relative overflow-hidden flex flex-col justify-between shadow-[0_0_30px_rgba(0,0,0,0.6)]">
            <div className="absolute top-0 right-0 bg-white/10 text-gray-300 text-[10px] font-mono font-black px-4 py-1 rounded-bl-xl uppercase tracking-wider">
              COMMUNITY BUILD
            </div>
            <div>
              <div className="flex items-center gap-3 mb-4">
                <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400">
                  <Terminal className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-2xl font-black font-display text-white">Linux</h2>
                  <p className="text-xs text-gray-400 font-mono">Debian, Ubuntu, Arch, Fedora</p>
                </div>
              </div>
              <ul className="space-y-2 mb-8 text-xs text-gray-300 font-sans">
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Vulkan & Proton Wine Integration</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>MangoHud & Gamescope Telemetry Pipeline</span>
                </li>
                <li className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-cyan-400 shrink-0" />
                  <span>Universal AppImage with Zero Install Overhead</span>
                </li>
              </ul>
            </div>

            <div className="space-y-3">
              <a
                href={LINUX_APPIMAGE_URL}
                className="w-full py-3.5 px-6 rounded-xl font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 font-mono bg-cyan-500/15 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/25 transition-all"
              >
                <Download className="w-4 h-4" />
                <span>Download AppImage</span>
              </a>
              <div className="grid grid-cols-3 gap-2 text-center text-[11px] font-mono">
                <a
                  href={LINUX_DEB_URL}
                  className="py-2 px-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/40 hover:text-cyan-300 transition-all truncate"
                >
                  Debian (.deb)
                </a>
                <a
                  href={LINUX_RPM_URL}
                  className="py-2 px-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/40 hover:text-cyan-300 transition-all truncate"
                >
                  Fedora (.rpm)
                </a>
                <a
                  href={LINUX_TAR_URL}
                  className="py-2 px-2 rounded-lg bg-white/5 border border-white/10 hover:border-cyan-400/40 hover:text-cyan-300 transition-all truncate"
                >
                  Archive (.tar.gz)
                </a>
              </div>
            </div>
          </div>
        </div>

        {/* Verification & System Requirements Footer */}
        <div className="glass-panel p-6 sm:p-8 rounded-2xl border border-white/5 bg-white/2 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-gray-400">
          <div className="flex items-center gap-3">
            <ShieldCheck className="w-5 h-5 text-neon-green shrink-0" />
            <span>All binary releases are SHA-256 verified and automated via CI/CD.</span>
          </div>
          <Link
            href="/docs/summary"
            className="text-neon-green hover:underline flex items-center gap-1 shrink-0"
          >
            <span>Read Architecture Docs</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </Link>
        </div>
      </div>
    </div>
  );
}
