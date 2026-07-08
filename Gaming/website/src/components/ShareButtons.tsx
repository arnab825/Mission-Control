'use client';

import { useState } from "react";
import { Check, Link as LinkIcon } from "lucide-react";

export default function ShareButtons({ url, title }: { url: string; title: string }) {
  const [copied, setCopied] = useState(false);
  const [copiedInstagram, setCopiedInstagram] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error("Failed to copy link:", err);
    }
  };

  const handleInstagram = async () => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedInstagram(true);
      setTimeout(() => setCopiedInstagram(false), 3000);
      window.open("https://instagram.com", "_blank");
    } catch (err) {
      console.error("Failed to copy link for Instagram:", err);
    }
  };

  const encodedUrl = encodeURIComponent(url);
  const encodedTitle = encodeURIComponent(title);

  return (
    <div className="flex flex-col gap-3">
      {/* Twitter / X */}
      <a 
        href={`https://twitter.com/intent/tweet?url=${encodedUrl}&text=${encodedTitle}`} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center justify-center gap-2 bg-[#1DA1F2]/10 hover:bg-[#1DA1F2]/20 border border-[#1DA1F2]/30 text-[#1DA1F2] px-4 py-2.5 rounded-md transition-colors font-display font-bold text-[10px] uppercase tracking-wider"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg> 
        Twitter / X
      </a>

      {/* LinkedIn */}
      <a 
        href={`https://www.linkedin.com/sharing/share-offsite/?url=${encodedUrl}`} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center justify-center gap-2 bg-[#0A66C2]/10 hover:bg-[#0A66C2]/20 border border-[#0A66C2]/30 text-[#0A66C2] px-4 py-2.5 rounded-md transition-colors font-display font-bold text-[10px] uppercase tracking-wider"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M19 0h-14c-2.761 0-5 2.239-5 5v14c0 2.761 2.239 5 5 5h14c2.762 0 5-2.239 5-5v-14c0-2.761-2.238-5-5-5zm-11 19h-3v-11h3v11zm-1.5-12.268c-.966 0-1.75-.79-1.75-1.764s.784-1.764 1.75-1.764 1.75.79 1.75 1.764-.783 1.764-1.75 1.764zm13.5 12.268h-3v-5.604c0-3.368-4-3.113-4 0v5.604h-3v-11h3v1.765c1.396-2.586 7-2.777 7 2.476v6.759z"/></svg>
        LinkedIn
      </a>

      {/* Reddit */}
      <a 
        href={`https://reddit.com/submit?url=${encodedUrl}&title=${encodedTitle}`} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center justify-center gap-2 bg-[#FF4500]/10 hover:bg-[#FF4500]/20 border border-[#FF4500]/30 text-[#FF4500] px-4 py-2.5 rounded-md transition-colors font-display font-bold text-[10px] uppercase tracking-wider"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M24 11.5c0-1.65-1.35-3-3-3-.96 0-1.86.48-2.42 1.24-1.64-1-3.85-1.64-6.29-1.72l1.32-4.16 4.31.92c.04.96.83 1.74 1.8 1.74 1 0 1.8-.8 1.8-1.8s-.8-1.8-1.8-1.8c-.84 0-1.53.58-1.73 1.35l-4.79-1.02c-.15-.03-.31.05-.36.2l-1.55 4.87c-2.5.04-4.77.68-6.44 1.69-.56-.73-1.44-1.19-2.44-1.19-1.65 0-3 1.35-3 3 0 1.12.61 2.1 1.53 2.61-.06.29-.09.59-.09.9 0 3.86 4.49 7 10 7s10-3.14 10-7c0-.31-.03-.61-.08-.9.92-.51 1.52-1.49 1.52-2.61zm-18 1c0-.83.67-1.5 1.5-1.5s1.5.67 1.5 1.5-.67 1.5-1.5 1.5-1.5-.67-1.5-1.5zm11 4.5c-1.77 1.4-4.88 1.4-6.66 0-.15-.12-.17-.34-.05-.49.12-.15.34-.17.49-.05 1.48 1.17 4.25 1.17 5.72 0 .15-.12.37-.1.49.05.12.15.1.37-.05.49zm-.5-3c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5z"/></svg>
        Reddit
      </a>

      {/* WhatsApp */}
      <a 
        href={`https://api.whatsapp.com/send?text=${encodedTitle}%20${encodedUrl}`} 
        target="_blank" 
        rel="noopener noreferrer" 
        className="flex items-center justify-center gap-2 bg-[#25D366]/10 hover:bg-[#25D366]/20 border border-[#25D366]/30 text-[#25D366] px-4 py-2.5 rounded-md transition-colors font-display font-bold text-[10px] uppercase tracking-wider"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946C.06 5.348 5.397.01 12.008.01c3.202.001 6.212 1.246 8.477 3.514 2.266 2.268 3.507 5.28 3.505 8.484-.004 6.657-5.34 11.997-11.953 11.997-2.005-.001-3.973-.502-5.724-1.455L0 24zm6.59-4.846c1.6.95 3.188 1.449 4.625 1.451 5.437.002 9.861-4.416 9.864-9.854.001-2.63-1.02-5.101-2.871-6.956C16.41 1.94 13.936.918 11.999.918c-5.442 0-9.866 4.42-9.869 9.861-.001 1.902.49 3.754 1.449 5.372l-.95 3.473 3.568-.936zm11.367-7.312c-.301-.15-1.781-.879-2.056-.979-.275-.1-.475-.15-.675.15-.2.3-.775.979-.95 1.179-.175.2-.35.225-.65.075-3.037-1.514-4.717-3.161-5.655-4.777-.3-.515.3-.478.857-1.596.09-.18.045-.337-.022-.487-.068-.15-.575-1.387-.787-1.9-.207-.5-.436-.433-.6-.442-.15-.007-.323-.008-.498-.008-.175 0-.46.066-.7.327-.24.262-.915.893-.915 2.178s.935 2.52 1.065 2.696c.13.176 1.84 2.81 4.458 3.941.623.269 1.109.43 1.488.55.627.199 1.198.171 1.649.104.503-.075 1.78-.728 2.03-1.43.25-.702.25-1.303.175-1.43-.075-.127-.275-.202-.575-.352z"/></svg>
        WhatsApp
      </a>

      {/* Instagram */}
      <button 
        onClick={handleInstagram} 
        className="flex items-center justify-center gap-2 bg-[#E1306C]/10 hover:bg-[#E1306C]/20 border border-[#E1306C]/30 text-[#E1306C] px-4 py-2.5 rounded-md transition-colors font-display font-bold text-[10px] uppercase tracking-wider cursor-pointer"
      >
        <svg viewBox="0 0 24 24" className="w-3.5 h-3.5 fill-current"><path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.205-.012 3.584-.069 4.849-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/></svg>
        {copiedInstagram ? "Link Copied!" : "Instagram"}
      </button>

      {/* Copy Link */}
      <button 
        onClick={handleCopy} 
        className="flex items-center justify-center gap-2 bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 px-4 py-2.5 rounded-md transition-colors font-display font-bold text-[10px] uppercase tracking-wider cursor-pointer"
      >
        {copied ? (
          <>
            <Check className="w-3.5 h-3.5 text-neon-green animate-pulse" />
            Copied Link
          </>
        ) : (
          <>
            <LinkIcon className="w-3.5 h-3.5 text-neon-green" />
            Copy Link
          </>
        )}
      </button>
    </div>
  );
}
