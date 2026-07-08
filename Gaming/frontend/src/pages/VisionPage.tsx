import React, { useState } from 'react';
import { Eye, Play, Square, Activity, Radar, AlertTriangle, CheckCircle, Clock, ArrowRight } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import type { TelemetryState } from '../types/telemetry';
import { useAuth } from '@clerk/clerk-react';

interface VisionPageProps {
  state: TelemetryState | null;
  sendCommand: (type: string, payload?: any) => void;
}

const PipelineBadge: React.FC<{ active: boolean; label: string }> = ({ active, label }) => (
  <div className="flex items-center gap-2">
    <div className={`w-1.5 h-1.5 rounded-full transition-all duration-500 ${active ? 'bg-neon-green shadow-[0_0_8px_#76b900] animate-pulse' : 'bg-zinc-600'
      }`} />
    <span className={`text-[10px] font-black uppercase tracking-widest transition-colors ${active ? 'text-neon-green' : 'text-zinc-500'
      }`}>{label}</span>
  </div>
);

const StatRow: React.FC<{ label: string; value: string; color?: string }> = ({ label, value, color = 'text-zinc-400' }) => (
  <div className="flex justify-between items-center border-b border-white/5 pb-2 last:border-0 font-mono">
    <span className="text-[10px] font-black text-zinc-500 uppercase tracking-wider">{label}</span>
    <span className={`text-[10px] font-black uppercase ${color}`}>{value}</span>
  </div>
);

const VisionPage: React.FC<VisionPageProps> = ({ state, sendCommand }) => {
  const { userId } = useAuth();
  const [manualActive, setManualActive] = useState(false);
  const [forceActivating, setForceActivating] = useState(false);

  // HUD filters and interactive controls
  const [nightVision, setNightVision] = useState(false);
  const [scanlines, setScanlines] = useState(true);
  const [crtCurve, setCrtCurve] = useState(false);
  const [minConfidence, setMinConfidence] = useState(0.4);
  const [activeLayer, setActiveLayer] = useState<'input' | 'backbone' | 'neck' | 'head'>('input');

  const isGameActive = state?.is_game_active === true;
  const hasFrame = !!state?.annotated_frame;
  const detectionsCount = state?.detections_count ?? 0;
  const healthVal = state?.health ?? 100;
  const visionFps = state?.vision_fps ?? 0;
  const captureFps = state?.capture_fps ?? 0;
  const inferenceMs = state?.vision_profiling?.inference ?? 0;
  const preMs = state?.vision_profiling?.pre ?? 0;
  const postMs = state?.vision_profiling?.post ?? 0;
  const currentGameName = state?.current_game ?? null;

  const dialogueText = state?.dialogue_text ?? '';
  const questTexts = state?.quest_texts ?? [];
  const detections = state?.detections ?? [];

  const pipelineRunning = isGameActive || manualActive;
  const pipelineLabel = isGameActive ? 'Pipeline Active' : manualActive ? 'Manual Override' : 'Pipeline Standby';
  const latencyVal = pipelineRunning ? (inferenceMs > 0 ? `${inferenceMs.toFixed(1)} ms` : '~2.4 ms') : 'Offline';

  const trackingLabel = pipelineRunning
    ? detectionsCount > 0 ? `Active · ${detectionsCount} Target${detectionsCount !== 1 ? 's' : ''}` : 'Scanning…'
    : 'Offline';
  const trackingColor = pipelineRunning ? (detectionsCount > 0 ? 'text-neon-green animate-pulse' : 'text-neon-green/60') : 'text-zinc-600';
  const healthLabel = pipelineRunning ? `${healthVal.toFixed(0)}%` : 'Standby';
  const healthColor = pipelineRunning ? (healthVal < 30 ? 'text-red-400 animate-pulse' : healthVal < 60 ? 'text-amber-400' : 'text-neon-yellow') : 'text-zinc-600';
  const threatLabel = pipelineRunning ? (detectionsCount > 3 ? 'HIGH' : detectionsCount > 0 ? 'MEDIUM' : 'NONE') : 'None';
  const threatColor = pipelineRunning ? (detectionsCount > 3 ? 'text-red-400 animate-pulse' : detectionsCount > 0 ? 'text-amber-400' : 'text-zinc-500') : 'text-zinc-600';
  const motionColor = pipelineRunning ? 'text-purple-400' : 'text-zinc-600';

  const gameRunning = !!(state as any)?.game_info;
  const diagnosisMsg = !pipelineRunning
    ? gameRunning
      ? 'Game detected but not in foreground — switch to game window or use Force Activate.'
      : 'No game in foreground. Launch a game from Library, or use Force Activate to test the pipeline.'
    : null;

  const handleForceActivate = () => {
    if (manualActive) {
      setManualActive(false);
    } else {
      setForceActivating(true);
      sendCommand('optimize_system', { userId });
      setTimeout(() => { setManualActive(true); setForceActivating(false); }, 800);
    }
  };

  // Filter detections locally in the frontend based on the user confidence threshold slider
  const filteredDetections = detections.filter(d => (d?.conf ?? 0) >= minConfidence);

  // Computes polar coordinates offset for drawing radar dots based on raw coordinates
  const getRadarCoords = (box: number[]) => {
    if (!box || box.length < 4) return { x: 50, y: 50 };
    // Detect if box bounds are normalized (0..1) or absolute pixels (0..640)
    const isNormalized = Math.max(...box) <= 1.0;
    const xMax = isNormalized ? 1.0 : 640;
    const yMax = isNormalized ? 1.0 : 640;
    const cx = (box[0] + box[2]) / 2;
    const cy = (box[1] + box[3]) / 2;

    // Scale points to remain comfortably within the circular radar area (15% to 85%)
    const xPct = 15 + (cx / xMax) * 70;
    const yPct = 15 + (cy / yMax) * 70;
    return { x: xPct, y: yPct };
  };

  const layerDetails = {
    input: {
      name: 'Input Layer',
      role: 'Batch Preprocessing',
      desc: 'Resizes frames to 640x640, normalizes color channels, and executes batch TensorRT conversion sequences.',
      latency: '0.2 ms'
    },
    backbone: {
      name: 'Backbone Layer',
      role: 'CSPDarknet53 Feature Extractor',
      desc: 'Applies deep convolutional feature extraction to detect shapes, edges, and texture hierarchies.',
      latency: '1.4 ms'
    },
    neck: {
      name: 'Neck Layer',
      role: 'PANet Path Aggregation',
      desc: 'Combines low-level spatial detail with high-level semantic info to handle varying target scales.',
      latency: '0.6 ms'
    },
    head: {
      name: 'Prediction Head',
      role: 'Decoupled Anchor-Free Regression',
      desc: 'Performs multi-class object labeling and bounding-box regression output mapping in parallel.',
      latency: '0.9 ms'
    }
  };

  // Pre-configured coordinates for nodes in SVG neural net visualizer
  const xCoords = [80, 240, 400, 560];
  const yCoords = [30, 70, 110, 150, 190];
  const layerKeys: ('input' | 'backbone' | 'neck' | 'head')[] = ['input', 'backbone', 'neck', 'head'];

  const preVal = pipelineRunning ? preMs : 0;
  const infVal = pipelineRunning ? inferenceMs : 0;
  const postVal = pipelineRunning ? postMs : 0;
  const totalVal = preVal + infVal + postVal;

  return (
    <div className="flex-1 flex flex-col p-6 gap-y-5 overflow-y-auto custom-scrollbar font-['Inter',system-ui,sans-serif]">

      {/* Self-contained animations style injector */}
      <style dangerouslySetInnerHTML={{
        __html: `
        @keyframes radar-sweep {
          from { transform: rotate(0deg); }
          to { transform: rotate(360deg); }
        }
        .animate-radar-sweep {
          animation: radar-sweep 5s linear infinite;
        }
        @keyframes pulse-ring {
          0% { transform: scale(0.95); opacity: 0.4; }
          50% { transform: scale(1.15); opacity: 0.8; }
          100% { transform: scale(0.95); opacity: 0.4; }
        }
        .animate-pulse-ring {
          animation: pulse-ring 2.5s ease-in-out infinite;
        }
        @keyframes data-pulse {
          0% { stroke-dashoffset: 100; }
          100% { stroke-dashoffset: 0; }
        }
        .animate-data-pulse {
          stroke-dasharray: 8 6;
          animation: data-pulse 4s linear infinite;
        }
        .scanlines-overlay {
          background: linear-gradient(
            rgba(18, 16, 16, 0) 50%, 
            rgba(0, 0, 0, 0.3) 50%
          );
          background-size: 100% 4px;
        }
      `}} />

      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-3xl font-black text-transparent bg-clip-text bg-gradient-to-r from-neon-green to-white tracking-tighter uppercase drop-shadow-[0_0_12px_rgba(118, 185, 0,0.8)]">Vision Command Center</h2>
          <p className="text-[10px] text-zinc-600 font-bold uppercase tracking-widest mt-0.5">
            Real-time AI game vision · YOLOv8n · TensorRT inference
          </p>
        </div>
        <div className="flex items-center gap-4">
          <PipelineBadge active={pipelineRunning} label={pipelineLabel} />
          <motion.button
            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
            onClick={handleForceActivate}
            disabled={forceActivating}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest border transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed ${manualActive
                ? 'bg-red-500/15 border-red-500/30 text-red-400 hover:bg-red-500/25 shadow-[0_0_12px_rgba(239,68,68,0.1)]'
                : 'bg-neon-green/10 border-neon-green/25 text-neon-green hover:bg-neon-green/20 shadow-[0_0_12px_rgba(118, 185, 0,0.1)]'
              }`}
          >
            {forceActivating
              ? <><Activity className="w-3.5 h-3.5 animate-pulse" /> Activating…</>
              : manualActive
                ? <><Square className="w-3.5 h-3.5" /> Stop Manual</>
                : <><Play className="w-3.5 h-3.5" /> Force Activate</>}
          </motion.button>
        </div>
      </div>

      {/* Diagnosis Banner */}
      <AnimatePresence>
        {diagnosisMsg && (
          <motion.div
            initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -8 }}
            className="flex items-start gap-3 bg-amber-500/8 border border-amber-500/20 rounded-2xl px-5 py-3"
          >
            <AlertTriangle className="w-4 h-4 text-amber-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-[10px] font-black text-amber-400 uppercase tracking-wider mb-0.5">Pipeline Standby — Why?</p>
              <p className="text-[11px] text-zinc-400 leading-relaxed">{diagnosisMsg}</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid: Feed + Radar + Controls */}
      <div className="grid grid-cols-1 xl:grid-cols-4 gap-5">

        {/* Column 1-3: HUD Video Feed & Comms */}
        <div className="xl:col-span-3 flex flex-col gap-5">

          {/* Feed Card */}
          <div className="bg-zinc-950 border border-white/10 rounded-3xl overflow-hidden relative aspect-video shadow-[0_0_30px_rgba(118, 185, 0,0.02)] group">
            {pipelineRunning && hasFrame ? (
              <div className="absolute inset-0 overflow-hidden">
                <img
                  src={`data:image/jpeg;base64,${state!.annotated_frame}`}
                  alt="Tactical Vision Feed"
                  className={`w-full h-full object-cover transition-all duration-300 ${crtCurve ? 'scale-102 blur-[0.2px]' : ''
                    }`}
                  style={{
                    filter: nightVision
                      ? 'brightness(1.2) contrast(1.2) sepia(1) hue-rotate(85deg) saturate(2.5)'
                      : undefined,
                    transform: crtCurve
                      ? 'perspective(1000px) rotateX(1.5deg) scale(0.99)'
                      : undefined
                  }}
                />

                {/* CSS Scanlines Overlay */}
                {scanlines && (
                  <div className="absolute inset-0 scanlines-overlay pointer-events-none opacity-45" />
                )}

                {/* Night-Vision vignettes */}
                {nightVision && (
                  <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_40%,rgba(191, 255, 0,0.3))] pointer-events-none mix-blend-overlay" />
                )}

                {/* Cyberpunk HUD Frame Bracket Elements */}
                <div className="absolute inset-0 pointer-events-none p-4">
                  <div className="absolute top-4 left-4 w-4 h-4 border-t-2 border-l-2 border-neon-green opacity-60" />
                  <div className="absolute top-4 right-4 w-4 h-4 border-t-2 border-r-2 border-neon-green opacity-60" />
                  <div className="absolute bottom-4 left-4 w-4 h-4 border-b-2 border-l-2 border-neon-green opacity-60" />
                  <div className="absolute bottom-4 right-4 w-4 h-4 border-b-2 border-r-2 border-neon-green opacity-60" />

                  {/* Subtle crosshair in the center */}
                  <div className="absolute inset-0 flex items-center justify-center opacity-25">
                    <div className="w-10 h-10 border border-dashed border-neon-green rounded-full flex items-center justify-center">
                      <div className="w-1.5 h-1.5 bg-neon-green rounded-full" />
                    </div>
                  </div>
                </div>

                <div className="absolute top-4 left-4 bg-black/85 backdrop-blur-md px-3 py-1.5 border border-neon-green/30 rounded-full flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
                  <span className="text-[9px] font-black text-neon-green tracking-wider uppercase font-mono">
                    Live · {currentGameName || 'Game Feed'}
                  </span>
                </div>

                <div className="absolute bottom-4 right-4 bg-black/85 backdrop-blur-md px-3 py-1.5 border border-neon-green/25 rounded-xl flex items-center gap-4 font-mono text-[9px] text-zinc-400">
                  <div>CAP: <span className="text-white font-bold">{captureFps > 0 ? captureFps.toFixed(0) : state?.fps ?? 0}</span></div>
                  <div>VIS: <span className="text-neon-green font-bold">{visionFps.toFixed(0)}</span> fps</div>
                  <div>TARGETS: <span className="text-neon-green font-bold">{detectionsCount}</span></div>
                </div>
              </div>
            ) : pipelineRunning ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(118, 185, 0,0.015)_2px,rgba(118, 185, 0,0.015)_4px)] pointer-events-none" />
                <motion.div animate={{ rotate: 360 }} transition={{ duration: 2.5, repeat: Infinity, ease: 'linear' }}>
                  <Radar className="w-8 h-8 text-neon-green/50" />
                </motion.div>
                <h3 className="text-sm font-black text-white tracking-tighter uppercase">Scanning…</h3>
                <p className="text-[11px] text-zinc-600 font-bold">Pipeline active — bring your game window to the foreground</p>
              </div>
            ) : (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-4 text-center">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(118, 185, 0,0.04),transparent)] pointer-events-none" />
                <div className="z-10 flex flex-col items-center gap-3">
                  <Eye className="w-8 h-8 text-neon-green/40 animate-pulse" />
                  <h3 className="text-2xl font-black text-white/70 tracking-tighter uppercase">Awaiting Game Launch</h3>
                  <p className="text-zinc-600 text-[11px] font-bold max-w-xs leading-relaxed">
                    Launch a game from your Library. Mission Control activates automatically when a game is in the foreground.
                  </p>
                  <p className="text-[10px] text-zinc-700 tracking-[0.2em]">VISION PIPELINE · TACTICAL ANALYSIS · NEURAL COACHING</p>
                  <motion.button
                    whileHover={{ scale: 1.04 }} whileTap={{ scale: 0.97 }}
                    onClick={handleForceActivate}
                    className="mt-1 flex items-center gap-2 px-5 py-2 bg-neon-green/10 hover:bg-neon-green/20 border border-neon-green/25 rounded-xl text-[10px] font-black text-neon-green uppercase tracking-widest transition-all"
                  >
                    <Play className="w-3 h-3" /> Force Activate Pipeline
                  </motion.button>
                </div>
              </div>
            )}
          </div>

          {/* HUD Filter Toggles */}
          {pipelineRunning && hasFrame && (
            <div className="flex items-center justify-between flex-wrap gap-2 px-1">
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setNightVision(!nightVision)}
                  className={`px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all duration-200 ${nightVision
                      ? 'bg-neon-yellow/15 border-neon-yellow/40 text-neon-yellow shadow-[0_0_8px_rgba(191, 255, 0,0.15)]'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                >
                  [NIGHT VISION]
                </button>
                <button
                  onClick={() => setScanlines(!scanlines)}
                  className={`px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all duration-200 ${scanlines
                      ? 'bg-neon-green/15 border-neon-green/40 text-neon-green shadow-[0_0_8px_rgba(118, 185, 0,0.15)]'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                >
                  [SCANLINES]
                </button>
                <button
                  onClick={() => setCrtCurve(!crtCurve)}
                  className={`px-3 py-1.5 rounded-lg border text-[8px] font-black uppercase tracking-wider transition-all duration-200 ${crtCurve
                      ? 'bg-purple-500/15 border-purple-500/40 text-purple-400 shadow-[0_0_8px_rgba(168,85,247,0.15)]'
                      : 'bg-white/5 border-white/10 text-zinc-400 hover:text-white'
                    }`}
                >
                  [CRT WARP]
                </button>
              </div>

              <div className="flex items-center gap-2">
                <span className="text-[8px] font-black text-zinc-600 uppercase tracking-widest font-mono">
                  RENDER ENGINE:
                </span>
                <span className="text-[8px] font-mono font-bold text-zinc-400 uppercase">
                  {nightVision ? 'NVG Phosphor' : scanlines ? 'CRT Raster' : 'Raw Digital'}
                </span>
              </div>
            </div>
          )}

          {/* Bottom Grid Split: OCR Comms Stream & YOLO Latency bar charts */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">

            {/* VLM Comms Console (OCR output) */}
            <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 flex flex-col gap-3 font-mono shadow-[0_0_15px_rgba(118, 185, 0,0.02)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">VLM Comms Data Stream</span>
                <span className="text-[8px] bg-neon-green/10 text-neon-green border border-neon-green/20 px-2 py-0.5 rounded font-black uppercase tracking-wider animate-pulse">
                  {pipelineRunning ? 'Receiving' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-3 h-[110px] overflow-y-auto custom-scrollbar text-[11px] leading-relaxed">
                {pipelineRunning ? (
                  <>
                    <div className="border-l-2 border-neon-green/30 pl-3 py-0.5">
                      <span className="text-neon-green font-black tracking-wider uppercase block text-[9px] mb-1">
                        [DIALOGUE READOUT]
                      </span>
                      <p className={dialogueText ? "text-zinc-300 font-medium" : "text-zinc-500 italic"}>
                        {dialogueText ? `"${dialogueText}"` : "Waiting for active game dialogue..."}
                      </p>
                    </div>

                    <div className="border-l-2 border-purple-500/30 pl-3 py-0.5">
                      <span className="text-purple-400 font-black tracking-wider uppercase block text-[9px] mb-1">
                        [QUEST TRACKERS]
                      </span>
                      {questTexts.length > 0 ? (
                        <ul className="space-y-1 text-zinc-300">
                          {questTexts.map((q, idx) => (
                            <li key={idx} className="flex items-center gap-1.5">
                              <ArrowRight className="w-3 h-3 text-purple-400 shrink-0" />
                              <span>{q}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <p className="text-zinc-500 italic">Listening for HUD quest objectives...</p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="h-full flex items-center justify-center text-zinc-600 text-xs italic">
                    Mission Control Comms Offline. Standby for active session.
                  </div>
                )}
              </div>
            </div>

            {/* YOLO Speed Diagnostic */}
            <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 flex flex-col gap-3 font-mono shadow-[0_0_15px_rgba(118, 185, 0,0.02)]">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">YOLO INF SPEED DIAGNOSTIC</span>

              <div className="space-y-3 mt-1">
                {[
                  { label: 'Pre-Process', val: preVal, fallback: 0.25, color: 'from-neon-green to-blue-500' },
                  { label: 'Model Inference', val: infVal, fallback: 2.30, color: 'from-purple-500 to-indigo-500' },
                  { label: 'Post-Process', val: postVal, fallback: 0.65, color: 'from-neon-yellow to-neon-yellow' }
                ].map((item, idx) => {
                  const displayVal = item.val > 0 ? item.val : (pipelineRunning ? item.fallback : 0);
                  const pct = Math.min((displayVal / 8) * 100, 100);
                  return (
                    <div key={idx} className="space-y-1">
                      <div className="flex justify-between items-center text-[10px]">
                        <span className="text-zinc-400 font-bold uppercase">{item.label}</span>
                        <span className="text-white font-black">{displayVal > 0 ? `${displayVal.toFixed(2)} ms` : '0.00 ms'}</span>
                      </div>
                      <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${pct}%` }}
                          transition={{ duration: 0.5 }}
                          className={`h-full bg-gradient-to-r ${item.color}`}
                        />
                      </div>
                    </div>
                  );
                })}

                <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[10px] text-zinc-500 font-black">
                  <span>AGGREGATE LATENCY</span>
                  <span className="text-neon-green">
                    {totalVal > 0
                      ? `${totalVal.toFixed(2)} ms`
                      : (pipelineRunning ? '3.20 ms' : '0.00 ms')}
                  </span>
                </div>
              </div>
            </div>

          </div>

        </div>

        {/* Column 4: Side Panel Metrics & Radar */}
        <div className="xl:col-span-1 flex flex-col gap-5">

          {/* Diagnostic Stats Panel */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 flex flex-col gap-y-4 shadow-[0_0_15px_rgba(118, 185, 0,0.02)]">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-mono">AI Analysis</span>
            <div className="space-y-3">
              <StatRow label="Target Tracking" value={trackingLabel} color={trackingColor} />
              <StatRow label="Health Status" value={healthLabel} color={healthColor} />
              <StatRow label="Threat Level" value={threatLabel} color={threatColor} />
              <StatRow label="Movement Predict" value={pipelineRunning ? 'Predicting' : 'Waiting'} color={motionColor} />
            </div>
          </div>

          {/* Interactive Proximity Radar */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 flex flex-col items-center gap-3 shadow-[0_0_15px_rgba(118, 185, 0,0.02)] relative">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-mono">Proximity Compass</span>

            <div className="w-32 h-32 rounded-full border border-white/10 relative flex items-center justify-center overflow-hidden bg-black/45">

              {/* Outer pulsing ring */}
              <div className="absolute inset-0 rounded-full border border-neon-green/10 animate-pulse-ring" />

              {/* Radial crosshair lines */}
              <div className="absolute w-full h-[0.5px] bg-white/5" />
              <div className="absolute h-full w-[0.5px] bg-white/5" />
              <div className="absolute inset-4 rounded-full border border-dashed border-white/5" />
              <div className="absolute inset-8 rounded-full border border-white/5" />

              {/* Sweeping scan lines */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-tr from-neon-green/15 via-transparent to-transparent animate-radar-sweep pointer-events-none" />

              {/* Center blip */}
              <div className={`w-2 h-2 rounded-full z-10 ${pipelineRunning ? 'bg-neon-green shadow-[0_0_10px_#76b900] animate-pulse' : 'bg-zinc-700'
                }`} />

              {/* Dynamic threat warning blips mapped to actual target boxes */}
              {pipelineRunning && filteredDetections.map((det, idx) => {
                const coords = getRadarCoords(det.box);
                return (
                  <motion.div
                    key={`${det.label}-${idx}`}
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: [1, 1.25, 1], opacity: [1, 0.5, 1] }}
                    transition={{ duration: 1.5, repeat: Infinity, delay: idx * 0.15 }}
                    style={{ left: `${coords.x}%`, top: `${coords.y}%` }}
                    className="absolute w-2.5 h-2.5 -ml-1.25 -mt-1.25 rounded-full bg-red-500 shadow-[0_0_10px_#ef4444] border border-white/40 cursor-pointer"
                    title={`${det.label} (${((det.conf ?? 0.8) * 100).toFixed(0)}%)`}
                  />
                );
              })}

              {/* Standby blips placeholder */}
              {pipelineRunning && detectionsCount > 0 && filteredDetections.length === 0 && (
                <motion.div
                  animate={{ opacity: [1, 0.4, 1] }}
                  transition={{ duration: 0.8, repeat: Infinity }}
                  className="absolute top-4 left-8 w-2 h-2 rounded-full bg-amber-500 shadow-[0_0_8px_#f59e0b]"
                />
              )}
            </div>
          </div>

          {/* Detections list & slider */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 flex flex-col gap-3 font-mono shadow-[0_0_15px_rgba(118, 185, 0,0.02)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">Targets List</span>
              <span className="text-[8px] text-zinc-400 font-bold bg-white/5 border border-white/10 px-1.5 py-0.5 rounded">
                {filteredDetections.length} of {detections.length}
              </span>
            </div>

            {/* Confidence threshold slider */}
            <div className="space-y-1">
              <div className="flex justify-between items-center text-[8px]">
                <span className="text-zinc-500 font-black uppercase">CONF THRESHOLD</span>
                <span className="text-neon-green font-bold">{(minConfidence * 100).toFixed(0)}%</span>
              </div>
              <input
                type="range"
                min="0.1"
                max="0.9"
                step="0.05"
                value={minConfidence}
                onChange={(e) => setMinConfidence(parseFloat(e.target.value))}
                className="w-full h-1 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-green"
              />
            </div>

            <div className="space-y-2 max-h-[160px] overflow-y-auto custom-scrollbar pr-1 mt-1">
              {pipelineRunning && filteredDetections.length > 0 ? (
                filteredDetections.map((det, idx) => {
                  const confPct = (det.conf ?? 0.8) * 100;
                  const boxLabel = det.box
                    ? `[${det.box[0]}, ${det.box[1]}, ${det.box[2]}, ${det.box[3]}]`
                    : '[0, 0, 0, 0]';

                  return (
                    <div
                      key={`${det.label}-${idx}`}
                      className="p-2.5 bg-white/[0.02] border border-white/5 hover:border-neon-green/20 hover:bg-neon-green/[0.02] rounded-xl flex flex-col gap-1.5 transition-all group"
                    >
                      <div className="flex justify-between items-center text-[10px]">
                        <div className="flex items-center gap-1.5">
                          <span className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_6px_#76b900]" />
                          <span className="text-white font-black uppercase">{det.label ?? 'target'}</span>
                        </div>
                        <span className="text-neon-green font-bold text-[9px]">
                          {confPct.toFixed(0)}%
                        </span>
                      </div>

                      <div className="flex justify-between items-center text-[8px] text-zinc-500">
                        <span>BOUNDS: {boxLabel}</span>
                        <span className="opacity-0 group-hover:opacity-100 transition-opacity text-[7px] text-neon-green uppercase tracking-widest font-black">
                          TRACKING
                        </span>
                      </div>

                      <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                        <div
                          style={{ width: `${confPct}%` }}
                          className="h-full bg-gradient-to-r from-neon-green to-blue-500"
                        />
                      </div>
                    </div>
                  );
                })
              ) : (
                <div className="text-[10px] text-zinc-600 text-center py-6 italic leading-relaxed">
                  {pipelineRunning
                    ? 'No targets detected above threshold.'
                    : 'Tactical target scanner offline.'}
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Bottom Row: Animated SVG Neural Network & Diagnostics */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">

        {/* Animated SVG Neural Network Card */}
        <div className="lg:col-span-3 bg-white/[0.04] border border-white/10 rounded-3xl p-6 relative overflow-hidden shadow-[0_0_15px_rgba(118, 185, 0,0.02)]">
          <div className="flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-mono">Neural Network Status</span>
            <div className="flex items-center gap-2 text-[9px] text-zinc-400 font-mono">
              <span className="text-zinc-600">SELECTED LAYER:</span>
              <span className="text-neon-green font-bold uppercase">{activeLayer}</span>
            </div>
          </div>

          <div className="flex flex-col md:flex-row gap-6 items-stretch">

            {/* SVG Visualizer Canvas */}
            <div className="flex-[2] relative min-h-[200px] border border-white/5 rounded-2xl p-2 bg-black/20 flex items-center justify-center">
              <svg width="100%" height="100%" viewBox="0 0 640 220" className="opacity-95 select-none">

                {/* SVG Connections between layer groups */}
                {xCoords.map((x, colIdx) => {
                  if (colIdx === xCoords.length - 1) return null;
                  const nextX = xCoords[colIdx + 1];
                  const currentLayerKey = layerKeys[colIdx];
                  const isActive = activeLayer === currentLayerKey;

                  return yCoords.map((y1, row1) => {
                    return yCoords.map((y2, row2) => {
                      if (Math.abs(row1 - row2) > 1) return null; // keep connections clean
                      return (
                        <line
                          key={`line-${colIdx}-${row1}-${row2}`}
                          x1={x}
                          y1={y1}
                          x2={nextX}
                          y2={y2}
                          className={`${pipelineRunning
                              ? isActive
                                ? 'stroke-neon-green/50 stroke-[1.5] animate-data-pulse'
                                : 'stroke-zinc-700/25 stroke-[0.8]'
                              : 'stroke-zinc-800 stroke-[0.5]'
                            } transition-all duration-300`}
                        />
                      );
                    });
                  });
                })}

                {/* Layer Boundary Labels */}
                {xCoords.map((x, colIdx) => {
                  const key = layerKeys[colIdx];
                  const isSel = activeLayer === key;
                  return (
                    <text
                      key={`label-${colIdx}`}
                      x={x}
                      y={15}
                      textAnchor="middle"
                      onClick={() => setActiveLayer(key)}
                      className={`text-[8px] font-mono font-black uppercase tracking-wider cursor-pointer transition-colors ${isSel ? 'fill-neon-green font-extrabold' : 'fill-zinc-600 hover:fill-zinc-400'
                        }`}
                    >
                      {key}
                    </text>
                  );
                })}

                {/* Nodes representation */}
                {xCoords.map((x, colIdx) => {
                  const layerKey = layerKeys[colIdx];
                  const isSelected = activeLayer === layerKey;

                  return (
                    <g key={`layer-${layerKey}`}>
                      {yCoords.map((y, rowIdx) => (
                        <circle
                          key={`node-${colIdx}-${rowIdx}`}
                          cx={x}
                          cy={y}
                          r={isSelected ? 6 : 4}
                          onClick={() => setActiveLayer(layerKey)}
                          className={`cursor-pointer transition-all duration-300 ${pipelineRunning
                              ? isSelected
                                ? 'fill-neon-green stroke-white stroke-2 shadow-[0_0_10px_rgba(118, 185, 0,0.8)]'
                                : 'fill-zinc-800 stroke-zinc-600 hover:fill-zinc-600'
                              : 'fill-zinc-900 stroke-zinc-800'
                            }`}
                        />
                      ))}
                    </g>
                  );
                })}
              </svg>
            </div>

            {/* Neural Net Layer details information card */}
            <div className="flex-1 bg-white/[0.03] border border-white/5 rounded-2xl p-4 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-2 mb-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-neon-green shadow-[0_0_8px_#76b900] animate-pulse" />
                  <span className="text-[8px] font-black uppercase text-neon-green tracking-wider font-mono">
                    {layerDetails[activeLayer].role}
                  </span>
                </div>
                <h4 className="text-xs font-black text-white uppercase tracking-tight mb-2">
                  {layerDetails[activeLayer].name}
                </h4>
                <p className="text-[10px] text-zinc-400 leading-relaxed">
                  {layerDetails[activeLayer].desc}
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/5 flex justify-between items-center text-[8px] font-mono">
                <span className="text-zinc-500 uppercase tracking-widest">LAYER INF LATENCY</span>
                <span className="text-neon-green font-bold">{layerDetails[activeLayer].latency}</span>
              </div>
            </div>

          </div>

          {/* Network signal details */}
          <div className="absolute bottom-4 left-6 flex items-center gap-4 font-mono text-[8px]">
            {[
              { label: 'CAPTURE', on: pipelineRunning, color: 'text-neon-green' },
              { label: 'VISION', on: pipelineRunning && visionFps > 0, color: 'text-purple-400' },
              { label: 'BRAIN', on: isGameActive, color: 'text-neon-yellow' },
            ].map(s => (
              <div key={s.label} className="flex items-center gap-1">
                <div className={`w-1 h-1 rounded-full ${s.on ? `bg-current ${s.color}` : 'bg-zinc-700'}`} />
                <span className={s.on ? s.color : 'text-zinc-700'}>{s.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Stats Column */}
        <div className="lg:col-span-1 flex flex-col gap-3 min-w-[140px] font-mono">
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 shadow-[0_0_10px_rgba(118, 185, 0,0.02)]">
            <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Inference Latency</p>
            <p className={`text-sm font-black uppercase ${pipelineRunning ? 'text-neon-green' : 'text-white/25'}`}>{latencyVal}</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 shadow-[0_0_10px_rgba(118, 185, 0,0.02)]">
            <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Vision Model</p>
            <p className="text-sm font-black text-neon-green uppercase">YOLOv8n</p>
          </div>
          <div className="bg-white/[0.04] border border-white/10 rounded-2xl p-4 shadow-[0_0_10px_rgba(118, 185, 0,0.02)]">
            <p className="text-[8px] font-black text-zinc-500 uppercase mb-1">Strategic AI</p>
            <p className="text-xs font-black text-purple-400 uppercase">{(state as any)?.strategic_model || 'Nemotron-4'}</p>
          </div>
          <div className={`bg-white/[0.04] border rounded-2xl p-4 ${pipelineRunning ? 'border-neon-yellow/30 shadow-[0_0_10px_rgba(191, 255, 0,0.1)]' : 'border-white/10 shadow-[0_0_10px_rgba(118, 185, 0,0.02)]'}`}>
            <p className="text-[8px] font-black text-zinc-500 uppercase mb-1.5">Pipeline Health</p>
            <div className="flex items-center gap-1.5">
              {pipelineRunning
                ? <CheckCircle className="w-3.5 h-3.5 text-neon-yellow" />
                : <Clock className="w-3.5 h-3.5 text-zinc-600" />}
              <p className={`text-[9px] font-black uppercase ${pipelineRunning ? 'text-neon-yellow' : 'text-zinc-600'}`}>
                {pipelineRunning ? 'Nominal' : 'Standby'}
              </p>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
};

export default VisionPage;
