import React, { useState, useEffect, useCallback } from 'react';
import { Gamepad2, Zap, Sliders, Volume2, Check, RefreshCw, AlertCircle } from 'lucide-react';
import type { TelemetryState } from '../types/telemetry';

interface ControllerMappingProps {
  state: TelemetryState | null;
  sendCommand: (type: string, payload?: any) => void;
}

export interface GamepadDevice {
  id: string;
  index: number;
  mapping: string;
  buttons: number;
  axes: number;
}

const ACTION_DEFINITIONS = [
  { id: 'boost', label: 'One-Click System Boost', desc: 'Triggers instant GPU/CPU performance optimization', defaultBtn: 'LB+RB' },
  { id: 'voice_ai', label: 'Voice AI Push-To-Talk', desc: 'Activates AI Voice Recognition & STT stream', defaultBtn: 'DPAD_UP' },
  { id: 'vision_recon', label: 'Tactical HUD Recon', desc: 'Triggers Vision analysis & target detection scan', defaultBtn: 'Y' },
  { id: 'story_skip', label: 'Story Skip Assist', desc: 'Automation macro to skip non-interactive cutscenes', defaultBtn: 'X' },
  { id: 'toggle_overlay', label: 'Toggle HUD Overlay', desc: 'Shows/Hides Mission Control in-game overlay', defaultBtn: 'SELECT' },
];

const BUTTON_NAMES: Record<number, string> = {
  0: 'A / Cross',
  1: 'B / Circle',
  2: 'X / Square',
  3: 'Y / Triangle',
  4: 'LB / L1',
  5: 'RB / R1',
  6: 'LT / L2',
  7: 'RT / R2',
  8: 'Select / View',
  9: 'Start / Menu',
  10: 'L3 (Left Stick)',
  11: 'R3 (Right Stick)',
  12: 'D-Pad Up',
  13: 'D-Pad Down',
  14: 'D-Pad Left',
  15: 'D-Pad Right',
  16: 'Guide / Home',
};

export const ControllerMapping: React.FC<ControllerMappingProps> = ({ state, sendCommand }) => {
  const [gamepads, setGamepads] = useState<GamepadDevice[]>([]);
  const [activeGamepadIndex, setActiveGamepadIndex] = useState<number | null>(null);
  const [pressedButtons, setPressedButtons] = useState<Set<number>>(new Set());
  const [leftStick, setLeftStick] = useState({ x: 0, y: 0 });
  const [rightStick, setRightStick] = useState({ x: 0, y: 0 });

  const initialBindings = (state as any)?.controller_bindings || {
    boost: 'LB+RB',
    voice_ai: 'DPAD_UP',
    vision_recon: 'Y',
    story_skip: 'X',
    toggle_overlay: 'SELECT'
  };

  const [bindings, setBindings] = useState<Record<string, string>>(initialBindings);
  const [deadzone, setDeadzone] = useState<number>((state as any)?.controller_deadzone ?? 0.15);
  const [recordingAction, setRecordingAction] = useState<string | null>(null);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [isRumblerActive, setIsRumblerActive] = useState(false);

  // Sync state from backend telemetry if available
  useEffect(() => {
    if ((state as any)?.controller_bindings) {
      setBindings((state as any).controller_bindings);
    }
    if ((state as any)?.controller_deadzone !== undefined) {
      setDeadzone((state as any).controller_deadzone);
    }
  }, [state]);

  // Request controller config from backend on mount
  useEffect(() => {
    sendCommand('get_controller_config');
  }, [sendCommand]);

  // HTML5 Gamepad API polling loop
  const updateGamepads = useCallback(() => {
    const rawPads = navigator.getGamepads ? navigator.getGamepads() : [];
    const activePads: GamepadDevice[] = [];
    
    for (let i = 0; i < rawPads.length; i++) {
      const pad = rawPads[i];
      if (pad && pad.connected) {
        activePads.push({
          id: pad.id,
          index: pad.index,
          mapping: pad.mapping,
          buttons: pad.buttons.length,
          axes: pad.axes.length,
        });
      }
    }

    setGamepads(activePads);

    if (activePads.length > 0) {
      if (activeGamepadIndex === null || !activePads.some(p => p.index === activeGamepadIndex)) {
        setActiveGamepadIndex(activePads[0].index);
      }
    } else {
      setActiveGamepadIndex(null);
    }
  }, [activeGamepadIndex]);

  useEffect(() => {
    const handleConnected = () => updateGamepads();
    const handleDisconnected = () => updateGamepads();

    window.addEventListener('gamepadconnected', handleConnected);
    window.addEventListener('gamepaddisconnected', handleDisconnected);
    updateGamepads();

    return () => {
      window.removeEventListener('gamepadconnected', handleConnected);
      window.removeEventListener('gamepaddisconnected', handleDisconnected);
    };
  }, [updateGamepads]);

  // Poll button states & analog axes at 60Hz
  useEffect(() => {
    let animFrame: number;

    const pollInputs = () => {
      if (activeGamepadIndex !== null) {
        const rawPads = navigator.getGamepads ? navigator.getGamepads() : [];
        const pad = rawPads[activeGamepadIndex];

        if (pad && pad.connected) {
          const currentlyPressed = new Set<number>();
          pad.buttons.forEach((btn, idx) => {
            if (btn.pressed || btn.value > 0.4) {
              currentlyPressed.add(idx);
            }
          });

          setPressedButtons(currentlyPressed);

          // Apply deadzone filtering to analog sticks
          const applyDeadzone = (val: number) => (Math.abs(val) > deadzone ? val : 0);

          setLeftStick({
            x: applyDeadzone(pad.axes[0] || 0),
            y: applyDeadzone(pad.axes[1] || 0),
          });
          setRightStick({
            x: applyDeadzone(pad.axes[2] || 0),
            y: applyDeadzone(pad.axes[3] || 0),
          });

          // Handle button recording mode
          if (recordingAction && currentlyPressed.size > 0) {
            const firstPressed = Array.from(currentlyPressed)[0];
            const btnName = BUTTON_NAMES[firstPressed] || `Button ${firstPressed}`;
            setBindings(prev => ({ ...prev, [recordingAction]: btnName }));
            setRecordingAction(null);
          }
        }
      }
      animFrame = requestAnimationFrame(pollInputs);
    };

    animFrame = requestAnimationFrame(pollInputs);
    return () => cancelAnimationFrame(animFrame);
  }, [activeGamepadIndex, deadzone, recordingAction]);

  const handleTestRumble = () => {
    setIsRumblerActive(true);
    // Send to backend Python XInput layer
    sendCommand('trigger_controller_rumble', { left_motor: 0.8, right_motor: 0.8, duration: 0.4 });

    // Trigger HTML5 Web Gamepad Haptics in Browser if available
    if (activeGamepadIndex !== null) {
      const rawPads = navigator.getGamepads ? navigator.getGamepads() : [];
      const pad = rawPads[activeGamepadIndex] as any;
      if (pad && pad.vibrationActuator && typeof pad.vibrationActuator.playEffect === 'function') {
        try {
          pad.vibrationActuator.playEffect('dual-rumble', {
            startDelay: 0,
            duration: 400,
            weakMagnitude: 0.8,
            strongMagnitude: 0.8,
          });
        } catch (e) {
          // ignore if vibration unsupported
        }
      }
    }

    setTimeout(() => setIsRumblerActive(false), 500);
  };

  const handleSave = () => {
    sendCommand('save_controller_mappings', {
      bindings,
      deadzone
    });
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 bg-white/[0.03] border border-white/10 rounded-3xl">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-neon-green/10 border border-neon-green/30 text-neon-green">
            <Gamepad2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-black text-white uppercase tracking-wider">Controller & Gamepad Configuration</h3>
            <p className="text-[10px] font-bold text-zinc-500 uppercase tracking-widest mt-0.5">
              Xbox · PlayStation · XInput · DirectInput Support
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {gamepads.length > 0 ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-neon-green/10 border border-neon-green/30 text-neon-green font-mono text-[10px] font-black uppercase">
              <span className="w-2 h-2 rounded-full bg-neon-green animate-pulse" />
              <span>{gamepads.length} Device(s) Connected</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-zinc-400 font-mono text-[10px] font-black uppercase">
              <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
              <span>No Controller Detected</span>
            </div>
          )}

          <button
            type="button"
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 bg-neon-green hover:bg-[#8aff00] text-black font-black uppercase text-[10px] tracking-widest rounded-xl transition-all shadow-[0_0_15px_rgba(118,185,0,0.25)] cursor-pointer"
          >
            {savedSuccess ? <Check className="w-4 h-4" /> : <Zap className="w-4 h-4" />}
            <span>{savedSuccess ? 'Saved!' : 'Save Mappings'}</span>
          </button>
        </div>
      </div>

      {/* Main Grid: Interactive Controller Diagram + Settings */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Left Column: Interactive Gamepad Diagram */}
        <div className="lg:col-span-6 bg-black/40 border border-white/10 rounded-3xl p-6 flex flex-col justify-between items-center relative overflow-hidden">
          <div className="w-full flex items-center justify-between mb-4">
            <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest font-mono">
              Live Input Tester
            </span>
            {activeGamepadIndex !== null && (
              <span className="text-[9px] font-mono text-neon-green font-bold truncate max-w-[220px]">
                {gamepads.find(p => p.index === activeGamepadIndex)?.id || 'Gamepad Active'}
              </span>
            )}
          </div>

          {/* SVG Gamepad Layout */}
          <div className="relative w-full max-w-[340px] aspect-[4/3] flex items-center justify-center my-4">
            <svg viewBox="0 0 400 300" className="w-full h-full drop-shadow-[0_0_20px_rgba(0,0,0,0.8)]">
              {/* Controller Main Body Shell */}
              <path
                d="M 100 80 Q 200 65 300 80 C 350 90 380 140 370 210 C 360 270 310 280 280 230 L 250 180 Q 200 190 150 180 L 120 230 C 90 280 40 270 30 210 C 20 140 50 90 100 80 Z"
                fill="#121218"
                stroke="rgba(255,255,255,0.15)"
                strokeWidth="3"
              />

              {/* LB / RB Bumpers */}
              <rect
                x="80" y="55" width="75" height="18" rx="6"
                className={`transition-all ${pressedButtons.has(4) ? 'fill-neon-green stroke-neon-green filter drop-shadow-[0_0_10px_#76b900]' : 'fill-zinc-800 stroke-zinc-700'}`}
                strokeWidth="2"
              />
              <text x="117" y="68" textAnchor="middle" className="fill-zinc-400 font-mono text-[10px] font-black pointer-events-none">LB</text>

              <rect
                x="245" y="55" width="75" height="18" rx="6"
                className={`transition-all ${pressedButtons.has(5) ? 'fill-neon-green stroke-neon-green filter drop-shadow-[0_0_10px_#76b900]' : 'fill-zinc-800 stroke-zinc-700'}`}
                strokeWidth="2"
              />
              <text x="282" y="68" textAnchor="middle" className="fill-zinc-400 font-mono text-[10px] font-black pointer-events-none">RB</text>

              {/* D-PAD */}
              <g transform="translate(110, 160)">
                {/* D-Pad Up */}
                <rect x="-10" y="-32" width="20" height="22" rx="3" className={`transition-all ${pressedButtons.has(12) ? 'fill-neon-green' : 'fill-zinc-800'}`} />
                {/* D-Pad Down */}
                <rect x="-10" y="10" width="20" height="22" rx="3" className={`transition-all ${pressedButtons.has(13) ? 'fill-neon-green' : 'fill-zinc-800'}`} />
                {/* D-Pad Left */}
                <rect x="-32" y="-10" width="22" height="20" rx="3" className={`transition-all ${pressedButtons.has(14) ? 'fill-neon-green' : 'fill-zinc-800'}`} />
                {/* D-Pad Right */}
                <rect x="10" y="-10" width="22" height="20" rx="3" className={`transition-all ${pressedButtons.has(15) ? 'fill-neon-green' : 'fill-zinc-800'}`} />
                <circle cx="0" cy="0" r="10" fill="#181820" />
              </g>

              {/* ACTION BUTTONS (X, Y, A, B) */}
              <g transform="translate(290, 125)">
                {/* Y (North) */}
                <circle cx="0" cy="-25" r="12" className={`transition-all ${pressedButtons.has(3) ? 'fill-neon-green stroke-neon-green' : 'fill-zinc-800 stroke-zinc-700'}`} strokeWidth="2" />
                <text x="0" y="-21" textAnchor="middle" className="fill-white font-mono text-[10px] font-black pointer-events-none">Y</text>

                {/* B (East) */}
                <circle cx="25" cy="0" r="12" className={`transition-all ${pressedButtons.has(1) ? 'fill-red-500 stroke-red-400' : 'fill-zinc-800 stroke-zinc-700'}`} strokeWidth="2" />
                <text x="25" y="4" textAnchor="middle" className="fill-white font-mono text-[10px] font-black pointer-events-none">B</text>

                {/* A (South) */}
                <circle cx="0" cy="25" r="12" className={`transition-all ${pressedButtons.has(0) ? 'fill-neon-green stroke-neon-green' : 'fill-zinc-800 stroke-zinc-700'}`} strokeWidth="2" />
                <text x="0" y="29" textAnchor="middle" className="fill-white font-mono text-[10px] font-black pointer-events-none">A</text>

                {/* X (West) */}
                <circle cx="-25" cy="0" r="12" className={`transition-all ${pressedButtons.has(2) ? 'fill-blue-500 stroke-blue-400' : 'fill-zinc-800 stroke-zinc-700'}`} strokeWidth="2" />
                <text x="-25" y="4" textAnchor="middle" className="fill-white font-mono text-[10px] font-black pointer-events-none">X</text>
              </g>

              {/* LEFT STICK (L3) */}
              <g transform={`translate(${140 + leftStick.x * 12}, ${115 + leftStick.y * 12})`}>
                <circle cx="0" cy="0" r="24" fill="#0d0d12" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <circle cx="0" cy="0" r="18" className={`transition-all ${pressedButtons.has(10) ? 'fill-neon-green' : 'fill-zinc-700'}`} />
              </g>

              {/* RIGHT STICK (R3) */}
              <g transform={`translate(${250 + rightStick.x * 12}, ${175 + rightStick.y * 12})`}>
                <circle cx="0" cy="0" r="24" fill="#0d0d12" stroke="rgba(255,255,255,0.2)" strokeWidth="2" />
                <circle cx="0" cy="0" r="18" className={`transition-all ${pressedButtons.has(11) ? 'fill-neon-green' : 'fill-zinc-700'}`} />
              </g>

              {/* SELECT & START BUTTONS */}
              <rect x="175" y="115" width="16" height="8" rx="3" className={`transition-all ${pressedButtons.has(8) ? 'fill-neon-green' : 'fill-zinc-700'}`} />
              <rect x="210" y="115" width="16" height="8" rx="3" className={`transition-all ${pressedButtons.has(9) ? 'fill-neon-green' : 'fill-zinc-700'}`} />
            </svg>
          </div>

          {/* Test Rumble & Deadzone Quick Controls */}
          <div className="w-full grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
            <button
              type="button"
              onClick={handleTestRumble}
              className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-wider transition-all cursor-pointer ${
                isRumblerActive
                  ? 'bg-neon-green text-black border-neon-green animate-bounce'
                  : 'bg-white/5 border-white/10 text-zinc-300 hover:border-white/20'
              }`}
            >
              <Volume2 className="w-3.5 h-3.5" />
              <span>Test Haptics / Vibration</span>
            </button>

            <div className="flex items-center justify-between px-3 py-1.5 bg-white/5 border border-white/10 rounded-xl font-mono text-[9px]">
              <span className="text-zinc-500 font-bold uppercase">Deadzone:</span>
              <span className="text-neon-green font-black">{(deadzone * 100).toFixed(0)}%</span>
            </div>
          </div>
        </div>

        {/* Right Column: Custom Action Mappings Table & Sliders */}
        <div className="lg:col-span-6 space-y-5">
          
          {/* Action Mapping Table */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 space-y-4 shadow-[0_0_15px_rgba(118,185,0,0.02)]">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-zinc-400 uppercase tracking-widest font-mono">
                Mission Control Feature Bindings
              </span>
              <button
                type="button"
                onClick={() => setBindings({ boost: 'LB+RB', voice_ai: 'DPAD_UP', vision_recon: 'Y', story_skip: 'X', toggle_overlay: 'SELECT' })}
                className="text-[9px] font-mono text-zinc-500 hover:text-zinc-300 flex items-center gap-1 cursor-pointer"
              >
                <RefreshCw className="w-3 h-3" /> Reset Defaults
              </button>
            </div>

            <div className="space-y-2.5">
              {ACTION_DEFINITIONS.map(act => {
                const isRecording = recordingAction === act.id;
                const currentBind = bindings[act.id] || act.defaultBtn;

                return (
                  <div
                    key={act.id}
                    className="p-3.5 bg-black/40 border border-white/5 hover:border-white/15 rounded-2xl flex items-center justify-between gap-3 transition-all"
                  >
                    <div>
                      <h5 className="text-[11px] font-black text-white uppercase tracking-tight">{act.label}</h5>
                      <p className="text-[9px] text-zinc-500">{act.desc}</p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setRecordingAction(isRecording ? null : act.id)}
                      className={`px-3 py-1.5 rounded-xl border text-[10px] font-mono font-black uppercase tracking-wider transition-all cursor-pointer ${
                        isRecording
                          ? 'bg-neon-green/20 border-neon-green text-neon-green animate-pulse shadow-[0_0_12px_rgba(118,185,0,0.3)]'
                          : 'bg-white/5 border-white/15 text-zinc-200 hover:border-neon-green/40 hover:text-neon-green'
                      }`}
                    >
                      {isRecording ? 'Press Button...' : currentBind}
                    </button>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Analog Deadzone Adjustment */}
          <div className="bg-white/[0.04] border border-white/10 rounded-3xl p-5 space-y-3 font-mono">
            <div className="flex items-center justify-between text-[10px]">
              <span className="text-zinc-400 font-black uppercase flex items-center gap-2">
                <Sliders className="w-3.5 h-3.5 text-neon-green" />
                Analog Stick Deadzone
              </span>
              <span className="text-neon-green font-bold">{(deadzone * 100).toFixed(0)}%</span>
            </div>

            <input
              type="range"
              min="0.05"
              max="0.35"
              step="0.01"
              value={deadzone}
              onChange={(e) => setDeadzone(parseFloat(e.target.value))}
              className="w-full h-1.5 bg-white/10 rounded-lg appearance-none cursor-pointer accent-neon-green"
            />
            <p className="text-[8px] text-zinc-500 leading-relaxed">
              Filters out unintended analog stick drift. Higher values require larger stick movements to register.
            </p>
          </div>

        </div>

      </div>
    </div>
  );
};
