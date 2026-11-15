"use client";

import React from "react";
import { Sliders, Tv, Cpu, Monitor, Zap } from "lucide-react";

interface RigSpecsPickerProps {
  gpu: string;
  setGpu: (val: string) => void;
  cpu: string;
  setCpu: (val: string) => void;
  ramGB: number;
  setRamGB: (val: number) => void;
  resolution: string;
  setResolution: (val: string) => void;
  fpsReported: number;
  setFpsReported: (val: number) => void;
  os: string;
  setOs: (val: string) => void;
  presetUsed: string;
  setPresetUsed: (val: string) => void;
}

export function RigSpecsPicker({
  gpu,
  setGpu,
  cpu,
  setCpu,
  ramGB,
  setRamGB,
  resolution,
  setResolution,
  fpsReported,
  setFpsReported,
  os,
  setOs,
  presetUsed,
  setPresetUsed,
}: RigSpecsPickerProps) {
  return (
    <div className="space-y-3 p-3.5 rounded-2xl bg-white/[0.02] border border-white/10">
      <div className="flex items-center gap-2 text-xs font-bold uppercase text-neon-green tracking-wider">
        <Sliders className="w-3.5 h-3.5 text-neon-green" /> Rig Specifications & Performance
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <div className="space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
            <Tv className="w-3 h-3 text-neon-green" /> Graphics Card (GPU)
          </span>
          <input
            type="text"
            required
            value={gpu}
            onChange={(e) => setGpu(e.target.value)}
            placeholder="e.g. RTX 4070 Ti 12GB"
            className="w-full px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-xs text-white focus:border-neon-green focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
            <Cpu className="w-3 h-3 text-neon-green" /> Processor (CPU)
          </span>
          <input
            type="text"
            required
            value={cpu}
            onChange={(e) => setCpu(e.target.value)}
            placeholder="e.g. Ryzen 7 7800X3D"
            className="w-full px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-xs text-white focus:border-neon-green focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
            <Monitor className="w-3 h-3 text-neon-green" /> Resolution
          </span>
          <select
            value={resolution}
            onChange={(e) => setResolution(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-xs text-white focus:border-neon-green focus:outline-none"
          >
            <option value="1080p (1920x1080)">1080p Full HD</option>
            <option value="1440p (2560x1440)">1440p Quad HD</option>
            <option value="4K (3840x2160)">4K Ultra HD</option>
            <option value="Ultrawide (3440x1440)">Ultrawide 21:9</option>
            <option value="720p / Steam Deck">720p / Handheld</option>
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase flex items-center gap-1">
            <Zap className="w-3 h-3 text-amber-400" /> Avg Measured FPS
          </span>
          <input
            type="number"
            min={1}
            max={999}
            value={fpsReported}
            onChange={(e) => setFpsReported(Number(e.target.value) || 60)}
            className="w-full px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-xs text-amber-300 font-mono focus:border-neon-green focus:outline-none"
          />
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase">RAM (GB)</span>
          <select
            value={ramGB}
            onChange={(e) => setRamGB(Number(e.target.value))}
            className="w-full px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-xs text-white focus:border-neon-green focus:outline-none"
          >
            <option value={16}>16 GB</option>
            <option value={32}>32 GB</option>
            <option value={64}>64 GB</option>
            <option value={8}>8 GB</option>
          </select>
        </div>

        <div className="space-y-1">
          <span className="text-[10px] text-gray-400 font-bold uppercase">Operating System</span>
          <select
            value={os}
            onChange={(e) => setOs(e.target.value)}
            className="w-full px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-xs text-white focus:border-neon-green focus:outline-none"
          >
            <option value="Windows 11">Windows 11</option>
            <option value="Windows 10">Windows 10</option>
            <option value="SteamOS / Linux">SteamOS / Linux</option>
          </select>
        </div>
      </div>

      <div className="space-y-1 pt-1">
        <span className="text-[10px] text-gray-400 font-bold uppercase">Settings / Tech Preset</span>
        <input
          type="text"
          value={presetUsed}
          onChange={(e) => setPresetUsed(e.target.value)}
          placeholder="e.g. Ultra RT + DLSS Quality + Frame Gen"
          className="w-full px-3 py-2 rounded-lg bg-black/70 border border-white/10 text-xs text-white focus:border-neon-green focus:outline-none"
        />
      </div>
    </div>
  );
}
