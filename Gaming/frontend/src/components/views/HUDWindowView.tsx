import React from 'react';
import HUD from '../HUD';
import type { TelemetryState } from '../../types/telemetry';

interface HUDWindowViewProps {
  state: TelemetryState | null;
  sendCommand: (type: string, payload?: any) => void;
  isHUDVisibleState: boolean;
}

export const HUDWindowView: React.FC<HUDWindowViewProps> = ({
  state,
  sendCommand,
  isHUDVisibleState,
}) => {
  if (!isHUDVisibleState) {
    return <div className="w-screen h-screen bg-transparent" />;
  }
  const layout = state?.config?.overlay?.layout || 'top-left';
  const alignClass = layout.includes('right') ? 'justify-end' : 'justify-start';
  const valignClass = layout.includes('bottom') ? 'items-end' : 'items-start';
  return (
    <div className={`w-screen h-screen bg-transparent overflow-hidden select-none font-['Inter',system-ui,sans-serif] flex ${alignClass} ${valignClass}`}>
      <HUD state={state} sendCommand={sendCommand} />
    </div>
  );
};
