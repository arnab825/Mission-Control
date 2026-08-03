"use client";

import { useQuery } from "@tanstack/react-query";

export function DocsVersionBadge() {
  const { data } = useQuery({
    queryKey: ["app-version"],
    queryFn: async () => {
      const res = await fetch("/api/version");
      if (!res.ok) throw new Error("Failed to fetch version");
      return res.json();
    },
    staleTime: 1000 * 60 * 10,
  });

  const version = data?.version || "2.8.4";

  return (
    <div className="border-t border-white/10 pt-4 mt-auto">
      <div className="flex items-center justify-between px-2 text-[10px] font-mono text-gray-400 uppercase tracking-widest">
        <div className="flex items-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-neon-green animate-pulse shadow-[0_0_8px_rgba(118,185,0,0.8)]" />
          <span>v{version} Release</span>
        </div>
        <span className="text-neon-green font-bold">Stable</span>
      </div>
    </div>
  );
}
