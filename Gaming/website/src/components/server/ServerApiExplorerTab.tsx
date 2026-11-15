"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { Check, Copy } from "lucide-react";
import { API_EXAMPLES } from "@/data/serverArchitectureData";

export const ServerApiExplorerTab: React.FC = () => {
  const [selectedApiIdx, setSelectedApiIdx] = useState<number>(0);
  const [copiedCode, setCopiedCode] = useState<boolean>(false);

  const handleCopyApi = () => {
    const example = API_EXAMPLES[selectedApiIdx];
    const payload = JSON.stringify(example.responseBody, null, 2);
    navigator.clipboard.writeText(payload);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const current = API_EXAMPLES[selectedApiIdx];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0 }}
      className="space-y-8"
    >
      <div>
        <h2 className="text-2xl sm:text-3xl font-black text-white">
          Interactive API Payload Explorer
        </h2>
        <p className="text-zinc-400 text-sm mt-1">
          Inspect real HTTP request and response structures served by the API Gateway and
          worker pools.
        </p>
      </div>

      {/* Endpoint Selector Buttons */}
      <div className="flex flex-wrap gap-2">
        {API_EXAMPLES.map((ex, idx) => (
          <button
            key={ex.path}
            type="button"
            onClick={() => setSelectedApiIdx(idx)}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-mono font-bold transition-all cursor-pointer ${
              selectedApiIdx === idx
                ? "bg-neon-green/20 border border-neon-green text-neon-green shadow-[0_0_15px_rgba(118,185,0,0.15)]"
                : "bg-white/[0.03] hover:bg-white/[0.08] border border-white/8 text-zinc-400"
            }`}
          >
            <span className={ex.method === "GET" ? "text-emerald-400" : "text-amber-400"}>
              {ex.method}
            </span>
            <span>{ex.name}</span>
          </button>
        ))}
      </div>

      {/* Selected Endpoint Card */}
      <div className="p-6 sm:p-8 rounded-3xl bg-zinc-900/60 border border-white/10 backdrop-blur-xl space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-6 border-b border-white/8">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span
                className={`px-2.5 py-0.5 rounded text-[10px] font-mono font-black uppercase border ${current.badgeColor}`}
              >
                {current.badge}
              </span>
              <span className="px-2.5 py-0.5 rounded text-[10px] font-mono bg-white/5 border border-white/10 text-zinc-300">
                {current.pool}
              </span>
            </div>
            <div className="flex items-center gap-3 font-mono text-sm sm:text-base text-white font-bold">
              <span
                className={
                  current.method === "GET" ? "text-emerald-400" : "text-amber-400"
                }
              >
                {current.method}
              </span>
              <span className="text-zinc-200">{current.path}</span>
            </div>
            <p className="text-xs text-zinc-400 mt-2 max-w-2xl">{current.description}</p>
          </div>

          <button
            type="button"
            onClick={handleCopyApi}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-zinc-300 hover:text-white text-xs font-mono transition-all self-start lg:self-center cursor-pointer"
          >
            {copiedCode ? (
              <Check className="w-3.5 h-3.5 text-neon-green" />
            ) : (
              <Copy className="w-3.5 h-3.5" />
            )}
            <span>{copiedCode ? "Copied Payload" : "Copy Response JSON"}</span>
          </button>
        </div>

        {/* If POST has request body */}
        {current.requestBody && (
          <div>
            <div className="text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
              Request Body (JSON)
            </div>
            <pre className="p-4 rounded-xl bg-black/60 border border-white/8 font-mono text-xs text-zinc-300 overflow-x-auto">
              {JSON.stringify(current.requestBody, null, 2)}
            </pre>
          </div>
        )}

        {/* Response Body */}
        <div>
          <div className="flex items-center justify-between text-xs font-mono text-zinc-400 uppercase tracking-wider mb-2">
            <span>Response Payload (HTTP 200 OK)</span>
            <span className="text-emerald-400 font-bold">application/json</span>
          </div>
          <pre className="p-4 rounded-xl bg-black/70 border border-white/8 font-mono text-xs text-emerald-400/90 overflow-x-auto max-h-96 custom-scrollbar">
            {JSON.stringify(current.responseBody, null, 2)}
          </pre>
        </div>
      </div>
    </motion.div>
  );
};
export default ServerApiExplorerTab;
