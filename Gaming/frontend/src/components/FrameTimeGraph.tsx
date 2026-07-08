import React, { useEffect, useRef } from 'react';

interface FrameTimeGraphProps {
  frametimes?: number[];
  width?: number | string;
  height?: number;
  className?: string;
  color?: string; // Hex color for the line
  maxMs?: number; // Maximum ms to scale the graph up to (e.g., 33.3ms for 30fps drop)
}

export const FrameTimeGraph: React.FC<FrameTimeGraphProps> = ({
  frametimes = [],
  width = '100%',
  height = 40,
  className = '',
  color = '#22c55e', // Default green
  maxMs = 33.3, // Baseline scale for 30fps drop. Anything above will clip or scale dynamically.
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Handle responsive width by getting physical size
    const rect = canvas.getBoundingClientRect();
    if (rect.width === 0 || rect.height === 0) return;
    
    // Setting canvas internal resolution to physical CSS pixels
    if (canvas.width !== rect.width || canvas.height !== rect.height) {
      canvas.width = rect.width;
      canvas.height = rect.height;
    }

    const w = canvas.width;
    const h = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, w, h);

    if (frametimes.length === 0) return;

    // Dynamically scale max if we have huge spikes
    const currentMax = Math.max(...frametimes, maxMs);

    ctx.beginPath();
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';

    const step = w / Math.max(1, frametimes.length - 1);

    for (let i = 0; i < frametimes.length; i++) {
      const ms = frametimes[i];
      const x = i * step;
      
      // Calculate Y (0 is top, h is bottom, so we invert)
      const normalized = Math.min(Math.max(ms / currentMax, 0), 1);
      const y = h - (normalized * h);

      if (i === 0) {
        ctx.moveTo(x, y);
      } else {
        ctx.lineTo(x, y);
      }
    }

    ctx.stroke();

    // Fill underneath
    ctx.lineTo(w, h);
    ctx.lineTo(0, h);
    ctx.closePath();
    
    ctx.fillStyle = `${color}33`; // 20% opacity
    ctx.fill();

  }, [frametimes, color, maxMs]);

  return (
    <canvas
      ref={canvasRef}
      className={`block w-full ${className}`}
      style={{ height: typeof height === 'number' ? `${height}px` : height, width }}
    />
  );
};
