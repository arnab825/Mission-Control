import React from 'react';
import { Info } from 'lucide-react';

export const metricExplanations: Record<string, string> = {
  // CPU
  'Processor': 'The Central Processing Unit (CPU) - the main brain of your computer that executes game instructions.',
  'Current Frequency': 'The speed at which your CPU cores execute instructions, measured in MegaHertz (MHz). Higher speeds yield smoother gameplay.',
  'Utilization': 'The percentage of total processing capacity currently being used by active games and system processes.',
  'Cores': 'Physical processing units on your CPU chip. More cores allow handling more background tasks simultaneously.',
  'Threads': 'Virtual processing cores. Hypershredding technology allows each physical core to work on multiple tasks at once.',
  
  // Memory
  'Memory Type': 'The generation of RAM (Double Data Rate e.g. DDR4 or DDR5) in your system. DDR5 transfers data significantly faster than DDR4.',
  'Total Capacity': 'Total Random Access Memory (RAM) available. More RAM prevents system stuttering when loading massive textures.',
  'Memory Speed': 'The frequency of data transfer between RAM and processor. Faster speed improves loading times and minimum 1% low frames.',
  'Modules Installed': 'Physical RAM sticks in motherboard DIMM slots. Dual sticks enable dual-channel bandwidth for up to double data speeds.',
  'Used Capacity': 'The amount of active memory occupied by open games and the operating system.',
  
  // GPU
  'Graphics Card': 'The Graphics Processing Unit (GPU) - handles rendering all frames, complex 3D meshes, shaders, and real-time lighting.',
  'Display Routing': 'How video frames travel from your graphics processor to the physical screen panel. In Hybrid mode, frames travel via the iGPU; with direct MUX switch, the dGPU connects straight to the screen for lower latency.',
  'Working Mode': 'The active GPU operation mode: Hybrid (Optimus) balances battery life with gaming, Discrete engages direct dGPU rendering with lowest latency, and iGPU Only maximises battery efficiency.',
  'Hardware MUX': 'A physical multiplexer chip on the laptop motherboard that switches the internal display panel connection between the integrated and discrete GPU.',
  'Latency Mode': 'Optimus adds a 1-3ms PCIe frame buffer copy overhead. Direct MUX switch eliminates this buffer overhead for immediate zero-latency presentation.',
  'VRAM Total': 'Total Video RAM on the GPU. Higher VRAM allows running games at higher resolutions (like 1440p or 4K) and Ultra textures.',
  'VRAM Used': 'Active Video RAM footprint. Exceeding your VRAM capacity causes severe lag spikes as assets load from slower system RAM.',
  'Dedicated VRAM': 'Ultra-fast memory built directly on your graphics card layout, dedicated purely to rendering.',
  'Power Draw': 'The electrical power currently consumed by your graphics card, measured in Watts (W).',
  'Driver Version': 'The operating software for your GPU. Keep this updated for maximum stability and performance optimizations in new games.',
  'Temperature': 'Current thermal status of your GPU core. Staying under 80-85°C prevents thermal throttling (GPU slowing down to cool off).',
  
  // Disk
  'Storage Device': 'The active drive where data is stored. Solid State Drives (SSDs) load games exponentially faster than Hard Drives (HDDs).',
  'Volume Partitions': 'Logical divisions on the storage drive (e.g. C: and D: partitions).',
  'System Disk': 'Indicates if this storage drive contains the Windows Operating System files.',
  'Page File (Paging)': 'A virtual memory file on the disk used as an overflow buffer when physical RAM is fully saturated.',
  'Serial Number': 'Unique hardware identifier code for the physical storage drive.',
  'Bus Generation': 'The interface standard (e.g. PCIe 3.0 or PCIe 4.0). PCIe 4.0 NVMe drives offer double the bandwidth of PCIe 3.0.',
  'Physical Slot': 'The slot format (e.g. M.2 or 2.5" SATA). M.2 NVMe drives connect directly to the motherboard for maximum speeds.',
  'Speed (R/W)': 'Read and Write speeds. Faster read speeds mean zero texture pop-in during gameplay.',

  // Network
  'Network Adapter': 'The hardware device (Ethernet port or Wi-Fi card) connecting your system to the internet.',
  'Current Throughput': 'Real-time bandwidth download/upload rate. Lower connection speed can cause network lag (high ping).',
  'SSID': 'The name of the Wi-Fi network you are currently connected to.',
  'Protocol': 'The Wi-Fi generation standard (e.g. Wi-Fi 6 or 802.11ax). Newer protocols offer lower latency in online combat.',
  'Signal Strength': 'The quality of connection between your device and the router. Higher percentage means fewer dropped packets.',
  'Channel': 'The specific radio frequency channel your Wi-Fi is broadcasting on. Less crowded channels have less interference.',
};

export const SpecRow: React.FC<{
  label: string;
  value: string | number;
  explanationKey?: string;
}> = ({ label, value, explanationKey }) => {
  const key = explanationKey || label;
  const explanation = metricExplanations[key];
  return (
    <div className="flex items-center justify-between border-b border-white/5 pb-2 pt-1.5 gap-2 sm:gap-4 relative min-w-0 max-w-full w-full">
      <div className="flex items-center gap-1.5 min-w-0 shrink-0 max-w-[45%] sm:max-w-[50%]">
        <span className="text-[11px] sm:text-xs font-bold text-zinc-500 uppercase tracking-wider truncate" title={label}>
          {label}
        </span>
        {explanation && (
          <div className="relative group/tooltip inline-block shrink-0">
            <span className="p-0.5 hover:bg-white/5 rounded-full cursor-help text-zinc-600 hover:text-neon-green transition-colors block">
              <Info className="w-3 h-3" />
            </span>
            <div className="absolute bottom-full left-0 mb-2 w-56 sm:w-64 p-3 bg-[#0a0a0f] border border-white/10 text-[10px] text-zinc-400 rounded-xl shadow-2xl opacity-0 invisible group-hover/tooltip:opacity-100 group-hover/tooltip:visible transition-all duration-200 z-50 pointer-events-none normal-case leading-relaxed font-medium">
              {explanation}
              <div className="absolute top-full left-4 -mt-1 border-4 border-transparent border-t-[#0a0a0f]" />
            </div>
          </div>
        )}
      </div>
      <span className="text-[11px] sm:text-xs font-black text-white text-right truncate pl-2 flex-1 min-w-0" title={value?.toString()}>
        {value}
      </span>
    </div>
  );
};
