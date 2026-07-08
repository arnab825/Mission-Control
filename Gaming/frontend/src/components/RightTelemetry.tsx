import React from 'react';
import { Activity, ShieldCheck, BrainCircuit, Layers, Zap, Cpu, Mic } from 'lucide-react';
import type { TelemetryState } from '../types/telemetry';

const StatusItem: React.FC<{ label: string; active: boolean; icon: any }> = ({ label, active, icon: Icon }) => (
  <div className="flex items-center justify-between p-2.5 rounded-lg bg-white/2 border border-white/4 hover:bg-white/4 transition-all">
    <div className="flex items-center gap-2.5">
      <div className={`p-1.5 rounded-md ${active ? 'bg-neon-green/10 text-neon-green glow-green' : 'bg-zinc-800/60 text-zinc-600'}`}>
        <Icon className="w-3 h-3" />
      </div>
      <span className="text-[9px] font-bold text-zinc-400 uppercase tracking-wider">{label}</span>
    </div>
    {active ? (
      <div className="flex items-center gap-1.5">
        <span className="text-[7px] font-bold text-neon-green/70 uppercase">Live</span>
        <div className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_6px_#76b900] animate-pulse" />
      </div>
    ) : (
      <div className="w-1.5 h-1.5 rounded-full bg-zinc-700/50" />
    )}
  </div>
);

const CapabilityCard: React.FC<{ title: string; description: string; icon: any }> = ({ title, description, icon: Icon }) => (
  <div className="p-3 rounded-xl bg-white/2 border border-white/4 hover:border-neon-green/30 hover:shadow-[0_0_15px_rgba(118, 185, 0,0.1)] transition-all group relative overflow-hidden glass-panel">
    <div className="absolute top-2 right-2 opacity-[0.06] group-hover:opacity-[0.2] transition-opacity">
      <Icon className="w-6 h-6 text-neon-green" />
    </div>
    <h5 className="text-[9px] font-black text-zinc-300 uppercase tracking-widest mb-0.5">{title}</h5>
    <p className="text-[9px] font-medium text-zinc-600 leading-relaxed pr-4">{description}</p>
  </div>
);

interface RightTelemetryProps {
  state: TelemetryState | null;
  isAgentic: boolean;
  isListening: boolean;
  isIntelOpen: boolean;
}

const RightTelemetry: React.FC<RightTelemetryProps> = ({ state, isAgentic, isListening, isIntelOpen }) => {
  return (
    <div className={`
      fixed inset-y-0 right-0 z-60 w-72 lg:relative lg:translate-x-0 border-l border-white/5 flex flex-col bg-[#050505]/70 backdrop-blur-2xl lg:bg-[#050505]/70
      transition-transform duration-300 ease-in-out pt-8 lg:pt-0
      ${isIntelOpen ? 'translate-x-0' : 'translate-x-full'}
    `}>
      <div className="p-5 gap-y-6 flex-1 overflow-y-auto custom-scrollbar">
        
        {/* Neural Status */}
        <div>
          <div className="flex items-center gap-2 mb-3">
            <Activity className="w-3.5 h-3.5 text-neon-green glow-text-teal" />
            <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Neural Status</h3>
          </div>
          <div className="space-y-1.5">
            <StatusItem label="Neural Agent" active={isAgentic} icon={BrainCircuit} />
            <StatusItem label="Vision" active={state?.is_game_active || false} icon={Layers} />
            <StatusItem label="Bridge" active={true} icon={Zap} />
            <StatusItem label="IO Hook" active={true} icon={Cpu} />
            <StatusItem label="Voice" active={isListening} icon={Mic} />
          </div>
        </div>

        {/* Agent Capabilities */}
        <div>
          <div className="flex items-center gap-2 mb-3 pt-2">
            <ShieldCheck className="w-3.5 h-3.5 text-neon-green" />
            <h3 className="text-[10px] font-black text-zinc-300 uppercase tracking-[0.2em]">Capabilities</h3>
          </div>
          <div className="space-y-2">
            <CapabilityCard title="Story Skip" description="Neural intent detection bypass." icon={Zap} />
            <CapabilityCard title="Tactical HUD" description="Vision API deep analysis." icon={BrainCircuit} />
            <CapabilityCard title="Sys Tuning" description="Kernel-level optimization." icon={Cpu} />
          </div>
        </div>

        {/* Reasoning Engine Dashboard */}
        <div className="pt-6 border-t border-white/4">
          <div className="p-4 rounded-xl bg-white/2 border border-white/4 relative neural-bg">
            <div className="absolute top-3 right-3">
              <div className="w-2 h-2 rounded-full bg-neon-green shadow-[0_0_8px_#76b900] animate-pulse" />
            </div>
            <p className="text-[9px] font-black text-neon-green/70 uppercase tracking-[0.2em] mb-3">Engine Metrics</p>
            <div className="space-y-2 font-mono text-[10px]">
              <div className="flex justify-between items-center border-b border-white/2 pb-1.5">
                <span className="text-zinc-600">TOK/SEC</span>
                <span className="text-zinc-300 font-bold">1,402</span>
              </div>
              <div className="flex justify-between items-center border-b border-white/2 pb-1.5">
                <span className="text-zinc-600">LATENCY</span>
                <span className="text-zinc-300 font-bold">42ms</span>
              </div>
              <div className="flex justify-between items-center pb-1.5">
                <span className="text-zinc-600">MODEL</span>
                <span className="text-neon-green font-bold">Nemotron</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default RightTelemetry;
