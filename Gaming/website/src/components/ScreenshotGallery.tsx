"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Maximize2, X, Activity, Scan, Cpu, BrainCircuit, Terminal } from "lucide-react";
import { MissionControlAppMockup } from "@/components/MissionControlAppMockup";

export function ScreenshotGallery() {
  const tabs = [
    { id: "dashboard", label: "Aero Telemetry Control", icon: Activity, src: "/screenshots/dashboard.png" },
    { id: "hud", label: "In-Game HUD Overlay", icon: Scan, src: "/screenshots/hud.png" },
    { id: "vision", label: "Real-time YOLO Vision", icon: BrainCircuit, src: "/screenshots/vision.jpg" },
    { id: "lab", label: "Performance Lab", icon: Cpu, src: "/screenshots/lab.jpg" },
  ];

  const [activeTab, setActiveTab] = useState(tabs[0].id);
  const [imageStatus, setImageStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [isLightboxOpen, setIsLightboxOpen] = useState(false);

  useEffect(() => {
    setImageStatus('loading');
  }, [activeTab]);

  const activeTabData = tabs.find(t => t.id === activeTab)!;

  // Fallback Mockup Generator
  const renderMockup = (tabId: string) => {
    switch (tabId) {
      case 'dashboard':
        return (
          <div className="w-full h-full relative overflow-hidden flex items-center justify-center p-2">
            <MissionControlAppMockup showWindowControls={false} className="max-h-full overflow-y-auto scale-95" />
          </div>
        );
      case 'hud':
        return (
          <div className="w-full h-full bg-[#111] rounded-[16px] sm:rounded-[24px] relative overflow-hidden">
             {/* Simulated Game Background */}
             <div className="absolute inset-0 bg-gradient-to-br from-gray-900 to-black opacity-80" />
             <div className="absolute top-4 sm:top-8 left-4 sm:left-8 glass-card border border-neon-green/40 bg-obsidian/90 p-3 sm:p-4 w-48 sm:w-64 rounded-xl shadow-2xl">
                <div className="text-neon-green text-[9px] sm:text-[10px] font-mono font-bold mb-2 flex items-center gap-2"><Scan className="w-3 h-3" /> HUD OVERLAY ACTIVE</div>
                <div className="text-white text-[10px] sm:text-xs font-mono border-l-2 border-neon-green pl-2">Enemy squad approaching: 45m North</div>
             </div>
             <div className="absolute top-4 sm:top-8 right-4 sm:right-8 glass-card border border-white/10 bg-black/60 p-2 sm:p-3 rounded-xl flex items-center gap-2 sm:gap-3">
                <div className="text-white font-mono text-xl sm:text-2xl font-black">165 <span className="text-[9px] sm:text-[10px] text-neon-green">FPS</span></div>
             </div>
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
               <Terminal className="w-8 h-8 sm:w-10 sm:h-10 text-gray-500 mb-2 sm:mb-3" />
               <span className="text-gray-400 font-mono text-xs sm:text-sm uppercase tracking-widest text-center px-4">Screenshot Pending</span>
               <span className="text-gray-500 text-[10px] sm:text-xs mt-2 text-center">Displaying simulated mockup until /public/screenshots/hud.jpg is added</span>
            </div>
          </div>
        );
      case 'vision':
        return (
          <div className="w-full h-full bg-[#0a0a0a] rounded-[16px] sm:rounded-[24px] border border-white/10 p-4 sm:p-6 flex flex-col relative overflow-hidden">
             <div className="h-full border-2 border-dashed border-neon-green/30 rounded-xl flex items-center justify-center relative bg-neon-green/5 overflow-hidden">
                <motion.div 
                  animate={{ left: ['20%', '22%', '20%'] }} 
                  transition={{ repeat: Infinity, duration: 4 }} 
                  className="absolute top-[20%] left-[20%] w-24 sm:w-32 h-32 sm:h-40 border-2 border-neon-yellow bg-neon-yellow/10" 
                />
                <div className="absolute top-[18%] left-[20%] bg-neon-yellow text-black text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5">PLAYER 98%</div>
                
                <motion.div 
                  animate={{ right: ['30%', '35%', '30%'] }} 
                  transition={{ repeat: Infinity, duration: 6 }} 
                  className="absolute bottom-[20%] right-[30%] w-16 sm:w-20 h-16 sm:h-20 border-2 border-red-500 bg-red-500/10" 
                />
                <div className="absolute bottom-[35%] right-[30%] bg-red-500 text-white text-[8px] sm:text-[9px] font-bold px-1.5 py-0.5">VEHICLE 85%</div>
             </div>
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
               <Terminal className="w-8 h-8 sm:w-10 sm:h-10 text-gray-500 mb-2 sm:mb-3" />
               <span className="text-gray-400 font-mono text-xs sm:text-sm uppercase tracking-widest text-center px-4">Screenshot Pending</span>
               <span className="text-gray-500 text-[10px] sm:text-xs mt-2 text-center">Displaying simulated mockup until /public/screenshots/vision.jpg is added</span>
            </div>
          </div>
        );
      case 'lab':
        return (
          <div className="w-full h-full bg-[#111] rounded-[16px] sm:rounded-[24px] border border-white/10 p-4 sm:p-6 flex gap-4 sm:gap-6 relative overflow-hidden">
             <div className="w-1/3 border-r border-white/10 pr-4 sm:pr-6 space-y-4 mt-4">
                <div className="h-4 w-20 sm:w-24 bg-white/20 rounded" />
                <div className="h-8 bg-neon-green/20 border border-neon-green/40 rounded-lg" />
                <div className="h-8 bg-white/5 rounded-lg" />
                <div className="h-8 bg-white/5 rounded-lg" />
             </div>
             <div className="w-2/3 space-y-6 mt-4">
                <div className="h-4 w-32 sm:w-48 bg-white/20 rounded" />
                <div className="h-2 w-full bg-white/10 rounded-full"><div className="h-full w-3/4 bg-neon-green rounded-full shadow-[0_0_10px_rgba(118,185,0,0.5)]" /></div>
                <div className="h-2 w-full bg-white/10 rounded-full"><div className="h-full w-1/2 bg-neon-yellow rounded-full shadow-[0_0_10px_rgba(255,255,0,0.5)]" /></div>
             </div>
             <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/60 backdrop-blur-sm z-10">
               <Terminal className="w-8 h-8 sm:w-10 sm:h-10 text-gray-500 mb-2 sm:mb-3" />
               <span className="text-gray-400 font-mono text-xs sm:text-sm uppercase tracking-widest text-center px-4">Screenshot Pending</span>
               <span className="text-gray-500 text-[10px] sm:text-xs mt-2 text-center">Displaying simulated mockup until /public/screenshots/lab.jpg is added</span>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="w-full flex flex-col items-center">
      {/* Tabs */}
      <div className="flex flex-wrap justify-center gap-2 sm:gap-4 mb-8 sm:mb-12 max-w-4xl">
        {tabs.map(tab => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3 rounded-full font-mono text-[10px] sm:text-sm font-bold transition-all duration-300 ${isActive ? "bg-neon-green text-obsidian shadow-[0_0_20px_rgba(118, 185, 0,0.4)] scale-105" : "bg-white/5 text-gray-400 hover:text-white hover:bg-white/10 border border-white/10"}`}
            >
              <Icon className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Main Preview Container */}
      <div className="relative w-full aspect-[16/10] sm:aspect-video max-w-5xl mx-auto rounded-[20px] sm:rounded-[32px] p-2 sm:p-3 bg-white/5 border border-white/10 shadow-2xl overflow-hidden group">
        <div className="absolute inset-0 bg-neon-green/5 blur-3xl opacity-50 pointer-events-none" />
        
        <div className="relative w-full h-full rounded-[14px] sm:rounded-[24px] overflow-hidden bg-obsidian border border-white/5">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, scale: 0.98 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 1.02 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              {/* Image Loading State */}
              {imageStatus === 'loading' && (
                <div className="absolute inset-0 bg-white/5 animate-pulse" />
              )}
              
              {/* Mockup Fallback */}
              {imageStatus === 'error' && renderMockup(activeTab)}

              {/* The actual image */}
              <img
                src={activeTabData.src}
                alt={activeTabData.label}
                onLoad={() => setImageStatus('loaded')}
                onError={() => setImageStatus('error')}
                className={`w-full h-full object-cover transition-all duration-700 ${imageStatus === 'loaded' ? 'opacity-100 scale-100' : 'opacity-0 scale-105'}`}
              />
            </motion.div>
          </AnimatePresence>

          {/* Expand Button Overlay (Only when image is successfully loaded) */}
          {imageStatus === 'loaded' && (
             <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/40 backdrop-blur-[2px] transition-all duration-300">
               <button 
                 onClick={() => setIsLightboxOpen(true)}
                 className="flex items-center gap-2 bg-neon-green text-obsidian px-5 sm:px-6 py-2.5 sm:py-3 rounded-full font-bold font-mono text-xs sm:text-sm hover:scale-105 transition-transform shadow-[0_0_30px_rgba(118, 185, 0,0.5)]"
               >
                 <Maximize2 className="w-3.5 h-3.5 sm:w-4 sm:h-4" /> Enlarge View
               </button>
             </div>
          )}
        </div>
      </div>

      {/* Lightbox Modal */}
      <AnimatePresence>
        {isLightboxOpen && imageStatus === 'loaded' && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-black/95 backdrop-blur-xl p-4 sm:p-8"
            onClick={() => setIsLightboxOpen(false)}
          >
            <button 
              className="absolute top-6 right-6 sm:top-10 sm:right-10 text-gray-400 hover:text-white bg-white/10 hover:bg-white/20 rounded-full p-2.5 sm:p-3 transition-colors"
              onClick={() => setIsLightboxOpen(false)}
            >
              <X className="w-5 h-5 sm:w-6 sm:h-6" />
            </button>
            <motion.img
              initial={{ scale: 0.9, y: 20 }}
              animate={{ scale: 1, y: 0 }}
              exit={{ scale: 0.9, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              src={activeTabData.src}
              alt={activeTabData.label}
              className="w-full h-full max-w-7xl object-contain shadow-2xl rounded-lg"
              onClick={(e) => e.stopPropagation()}
            />
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
