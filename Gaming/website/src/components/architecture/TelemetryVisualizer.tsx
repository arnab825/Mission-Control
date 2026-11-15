"use client";

import React, { useEffect, useRef } from "react";

export function TelemetryVisualizer() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    const points: number[] = Array.from({ length: 40 }, () => 50 + Math.random() * 20);
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    const resizeObserver = new ResizeObserver(() => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    });
    resizeObserver.observe(canvas);

    const draw = () => {
      ctx.clearRect(0, 0, width, height);

      // Draw high-tech grid
      ctx.strokeStyle = "rgba(118, 185, 0, 0.05)";
      ctx.lineWidth = 1;
      const gridGap = 30;
      for (let x = 0; x < width; x += gridGap) {
        ctx.beginPath();
        ctx.moveTo(x, 0);
        ctx.lineTo(x, height);
        ctx.stroke();
      }
      for (let y = 0; y < height; y += gridGap) {
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        ctx.stroke();
      }

      // Add dynamic point and shift line
      points.push(40 + Math.sin(Date.now() * 0.005) * 20 + Math.random() * 15);
      if (points.length > 50) points.shift();

      // Draw area gradient under the wave
      ctx.beginPath();
      ctx.moveTo(0, height);
      points.forEach((p, i) => {
        const x = (width / (points.length - 1)) * i;
        const y = height - (p / 100) * (height - 40) - 20;
        ctx.lineTo(x, y);
      });
      ctx.lineTo(width, height);
      ctx.closePath();
      const areaGrad = ctx.createLinearGradient(0, 0, 0, height);
      areaGrad.addColorStop(0, "rgba(118, 185, 0, 0.12)");
      areaGrad.addColorStop(1, "rgba(118, 185, 0, 0)");
      ctx.fillStyle = areaGrad;
      ctx.fill();

      // Draw connection lines
      ctx.beginPath();
      points.forEach((p, i) => {
        const x = (width / (points.length - 1)) * i;
        const y = height - (p / 100) * (height - 40) - 20;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      });
      ctx.strokeStyle = "rgba(118, 185, 0, 0.85)";
      ctx.lineWidth = 2.5;
      ctx.shadowColor = "rgba(118, 185, 0, 0.5)";
      ctx.shadowBlur = 10;
      ctx.stroke();
      ctx.shadowBlur = 0; // reset

      // Draw critical thresholds lines
      ctx.strokeStyle = "rgba(239, 68, 68, 0.2)";
      ctx.setLineDash([5, 5]);
      ctx.beginPath();
      ctx.moveTo(0, height * 0.25);
      ctx.lineTo(width, height * 0.25);
      ctx.stroke();
      ctx.setLineDash([]);

      ctx.fillStyle = "rgba(239, 68, 68, 0.5)";
      ctx.font = "8px monospace";
      ctx.fillText("CRITICAL VRAM LIMIT (85%)", 15, height * 0.25 - 5);

      // HUD Text Info overlay on Canvas
      ctx.fillStyle = "rgba(255, 255, 255, 0.7)";
      ctx.font = "10px monospace";
      ctx.fillText(`SYS_POLL: 60Hz`, 20, 25);
      ctx.fillText(
        `GPU_CLOCK: ${(1850 + Math.sin(Date.now() * 0.002) * 50).toFixed(0)} MHz`,
        20,
        40
      );

      const currentFPS = (162 + Math.random() * 4).toFixed(1);
      ctx.fillStyle = "rgba(118, 185, 0, 0.9)";
      ctx.font = "bold 11px monospace";
      ctx.fillText(`FPS: ${currentFPS}`, width - 110, 25);

      animationId = requestAnimationFrame(draw);
    };

    draw();

    return () => {
      cancelAnimationFrame(animationId);
      resizeObserver.disconnect();
    };
  }, []);

  return (
    <div className="w-full h-56 bg-obsidian/95 border border-white/5 rounded-2xl overflow-hidden p-4 relative flex flex-col justify-between">
      <div className="absolute top-3 right-3 bg-neon-green/10 text-neon-green text-[9px] font-mono border border-neon-green/30 rounded px-2 py-0.5 tracking-wider uppercase font-bold animate-pulse">
        HAL telemetry direct feed
      </div>
      <canvas ref={canvasRef} className="w-full flex-1" />
      <div className="flex justify-between items-center text-[10px] text-gray-500 font-mono pt-2 border-t border-white/5">
        <span>0ms latency check</span>
        <span>Hardware Hook: CONNECTED</span>
        <span>SYS_CORE_SENSORS</span>
      </div>
    </div>
  );
}
