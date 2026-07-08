"use client";

import { useEffect, useRef } from "react";

export default function InteractiveNetwork() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    const particles: Particle[] = [];
    const maxParticles = Math.min(70, Math.floor((width * height) / 20000));
    const connectionDistance = 130;
    const mouse = { x: -1000, y: -1000, active: false };
    
    // Ripple effect state
    const ripples: { x: number, y: number, radius: number, maxRadius: number, opacity: number }[] = [];

    // High-tech labels for simulation
    const techLabels = [
      "CUDA_CORE_OK",
      "TENSOR_RT_EVAL",
      "NIM_ENG_v2.4",
      "VRAM_FLUSHED",
      "HUD_HOOK_DX12",
      "FPS_TARGET_LOCK",
      "REFLEX_BOOST_ON",
      "DLSS_GENTIME",
      "LATENCY_0.8ms",
      "UUID_SECURE",
      "WMI_TEMP_NORM",
      "NVML_OPTIMIZED"
    ];

    class Particle {
      x: number;
      y: number;
      vx: number;
      vy: number;
      radius: number;
      label: string | null;
      labelPulseOffset: number;

      constructor(index: number) {
        this.x = Math.random() * width;
        this.y = Math.random() * height;
        this.vx = (Math.random() - 0.5) * 0.4;
        this.vy = (Math.random() - 0.5) * 0.4;
        this.radius = Math.random() * 1.5 + 1;
        this.label = index % 6 === 0 ? techLabels[Math.floor(Math.random() * techLabels.length)] : null;
        this.labelPulseOffset = Math.random() * Math.PI * 2;
      }

      update() {
        this.x += this.vx;
        this.y += this.vy;

        // Bounce boundaries
        if (this.x < 0 || this.x > width) this.vx *= -1;
        if (this.y < 0 || this.y > height) this.vy *= -1;

        if (mouse.active) {
          const dx = mouse.x - this.x;
          const dy = mouse.y - this.y;
          const dist = Math.hypot(dx, dy);
          if (dist < 220) {
            const force = (220 - dist) / 220;
            this.x += dx * 0.008 * force;
            this.y += dy * 0.008 * force;
          }
        }

        // Ripple force
        for (const ripple of ripples) {
          const dx = this.x - ripple.x;
          const dy = this.y - ripple.y;
          const dist = Math.hypot(dx, dy);
          if (Math.abs(dist - ripple.radius) < 20) {
            const force = (20 - Math.abs(dist - ripple.radius)) / 20;
            const angle = Math.atan2(dy, dx);
            this.vx += Math.cos(angle) * force * 1.5;
            this.vy += Math.sin(angle) * force * 1.5;
          }
        }
        
        // Dampen velocity back to normal
        this.vx *= 0.98;
        this.vy *= 0.98;
        if (Math.abs(this.vx) < 0.4) this.vx += (Math.random() - 0.5) * 0.1;
        if (Math.abs(this.vy) < 0.4) this.vy += (Math.random() - 0.5) * 0.1;
      }

      draw(context: CanvasRenderingContext2D, time: number) {
        context.beginPath();
        context.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
        context.fillStyle = "rgba(118, 185, 0, 0.35)";
        context.fill();

        if (this.label) {
          const opacity = 0.08 + 0.22 * Math.sin(time * 0.002 + this.labelPulseOffset);
          context.fillStyle = `rgba(191, 255, 0, ${opacity})`;
          context.font = "8px monospace";
          context.fillText(`[${this.label}]`, this.x + 8, this.y + 3);
        }
      }
    }

    // Initialize particles
    for (let i = 0; i < maxParticles; i++) {
      particles.push(new Particle(i));
    }

    // High-tech matrix streams floating in the background
    const streams: Array<{ x: number; y: number; speed: number; chars: string[]; size: number }> = [];
    const maxStreams = 15;
    for (let i = 0; i < maxStreams; i++) {
      streams.push({
        x: Math.random() * width,
        y: Math.random() * height - height,
        speed: Math.random() * 1.5 + 0.5,
        size: Math.floor(Math.random() * 3) + 8,
        chars: Array.from({ length: 10 }, () => Math.random() > 0.5 ? "1" : "0")
      });
    }

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    const handleMouseMove = (e: MouseEvent) => {
      mouse.x = e.clientX;
      mouse.y = e.clientY;
      mouse.active = true;
    };

    const handleMouseLeave = () => {
      mouse.active = false;
      mouse.x = -1000;
      mouse.y = -1000;
    };

    const handleClick = (e: MouseEvent) => {
      ripples.push({
        x: e.clientX,
        y: e.clientY,
        radius: 0,
        maxRadius: 300,
        opacity: 1
      });
      // Randomly spawn a short-lived text message at the click position
      const msgs = ["RECALCULATING...", "NODE_ACTIVATED", "SYNCING...", "NEURAL_PING", "PROCESSING"];
      streams.push({
        x: e.clientX,
        y: e.clientY - 20,
        speed: 1,
        size: 10,
        chars: [msgs[Math.floor(Math.random() * msgs.length)]]
      });
    };

    window.addEventListener("resize", handleResize);
    window.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseleave", handleMouseLeave);
    window.addEventListener("click", handleClick);

    let gridOffset = 0;

    const animate = () => {
      ctx.clearRect(0, 0, width, height);
      const time = Date.now();

      // ================= 1. MOUSE GLOW EFFECT =================
      if (mouse.active) {
        const glowRad = ctx.createRadialGradient(mouse.x, mouse.y, 0, mouse.x, mouse.y, 250);
        glowRad.addColorStop(0, "rgba(118, 185, 0, 0.08)");
        glowRad.addColorStop(0.5, "rgba(191, 255, 0, 0.03)");
        glowRad.addColorStop(1, "rgba(0, 0, 0, 0)");
        ctx.fillStyle = glowRad;
        ctx.beginPath();
        ctx.arc(mouse.x, mouse.y, 250, 0, Math.PI * 2);
        ctx.fill();
      }

      // ================= 2. FULLSCREEN DUAL PERSPECTIVE GRIDS (Horizon at Center) =================
      const horizonY = height * 0.5;
      const vanishingX = width / 2;
      gridOffset = (gridOffset + 0.35) % 40; // Scrolling grid offset

      const numLines = Math.min(40, Math.floor(width / 35));
      const gridLines = 14;

      // 2A. BOTTOM GRID (Converging from bottom to center horizon)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, horizonY, width, height - horizonY);
      ctx.clip();

      for (let i = 0; i <= numLines; i++) {
        const baseX = -width * 0.5 + (width * 2 / numLines) * i;
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(baseX, height);
        const alpha = 0.05 * Math.sin((i / numLines) * Math.PI);
        ctx.strokeStyle = `rgba(118, 185, 0, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      for (let i = 0; i < gridLines; i++) {
        const progress = (i * 40 + gridOffset) / (gridLines * 40);
        const y = horizonY + (height - horizonY) * Math.pow(progress, 2.5);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        const alpha = Math.min(0.06, ((y - horizonY) / (height - horizonY)) * 0.07);
        ctx.strokeStyle = `rgba(118, 185, 0, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();

      // 2B. TOP GRID (Converging from top to center horizon)
      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, width, horizonY);
      ctx.clip();

      for (let i = 0; i <= numLines; i++) {
        const baseX = -width * 0.5 + (width * 2 / numLines) * i;
        ctx.beginPath();
        ctx.moveTo(vanishingX, horizonY);
        ctx.lineTo(baseX, 0);
        const alpha = 0.05 * Math.sin((i / numLines) * Math.PI);
        ctx.strokeStyle = `rgba(118, 185, 0, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }

      for (let i = 0; i < gridLines; i++) {
        const progress = (i * 40 + gridOffset) / (gridLines * 40);
        const y = horizonY - horizonY * Math.pow(progress, 2.5);
        ctx.beginPath();
        ctx.moveTo(0, y);
        ctx.lineTo(width, y);
        const alpha = Math.min(0.06, ((horizonY - y) / horizonY) * 0.07);
        ctx.strokeStyle = `rgba(118, 185, 0, ${alpha})`;
        ctx.lineWidth = 0.8;
        ctx.stroke();
      }
      ctx.restore();

      // ================= 3. FLOATING TECHNICAL DIGITAL STREAMS =================
      ctx.fillStyle = "rgba(118, 185, 0, 0.08)";
      ctx.font = "10px monospace";
      for (const s of streams) {
        s.y += s.speed;
        if (s.y > height) {
          s.y = -100;
          s.x = Math.random() * width;
          s.speed = Math.random() * 1.5 + 0.5;
        }

        // Periodically mutate characters
        if (Math.random() > 0.98) {
          s.chars[Math.floor(Math.random() * s.chars.length)] = Math.random() > 0.5 ? "1" : "0";
        }

        for (let j = 0; j < s.chars.length; j++) {
          const charOpacity = 0.02 + (j / s.chars.length) * 0.06;
          ctx.fillStyle = `rgba(118, 185, 0, ${charOpacity})`;
          ctx.fillText(s.chars[j], s.x, s.y + j * 12);
        }
      }

      // ================= 4. CONSTELLATION NETWORK WITH DATA PULSES =================
      for (let i = 0; i < particles.length; i++) {
        const p1 = particles[i];
        p1.update();
        p1.draw(ctx, time);

        for (let j = i + 1; j < particles.length; j++) {
          const p2 = particles[j];
          const dist = Math.hypot(p1.x - p2.x, p1.y - p2.y);

          if (dist < connectionDistance) {
            const alpha = (1 - dist / connectionDistance) * 0.12;

            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(p2.x, p2.y);

            const grad = ctx.createLinearGradient(p1.x, p1.y, p2.x, p2.y);
            grad.addColorStop(0, `rgba(118, 185, 0, ${alpha})`);
            grad.addColorStop(1, `rgba(191, 255, 0, ${alpha * 0.4})`);
            ctx.strokeStyle = grad;
            ctx.lineWidth = 0.8;
            ctx.stroke();

            const speedMultiplier = 0.0006;
            const pulseProgress = (time * speedMultiplier + i * 0.15) % 1;
            const pulseX = p1.x + (p2.x - p1.x) * pulseProgress;
            const pulseY = p1.y + (p2.y - p1.y) * pulseProgress;

            ctx.beginPath();
            ctx.arc(pulseX, pulseY, 1.2, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(191, 255, 0, ${alpha * 1.6})`;
            ctx.fill();
          }
        }

        if (mouse.active) {
          const mDist = Math.hypot(p1.x - mouse.x, p1.y - mouse.y);
          if (mDist < connectionDistance * 1.5) {
            const alpha = (1 - mDist / (connectionDistance * 1.5)) * 0.16;
            ctx.beginPath();
            ctx.moveTo(p1.x, p1.y);
            ctx.lineTo(mouse.x, mouse.y);
            ctx.strokeStyle = `rgba(118, 185, 0, ${alpha})`;
            ctx.lineWidth = 0.8;
            ctx.stroke();
          }
        }
      }

      // ================= 5. DRAW RIPPLES =================
      for (let i = ripples.length - 1; i >= 0; i--) {
        const r = ripples[i];
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(118, 185, 0, ${r.opacity * 0.5})`;
        ctx.lineWidth = 2;
        ctx.stroke();
        
        ctx.beginPath();
        ctx.arc(r.x, r.y, r.radius * 0.8, 0, Math.PI * 2);
        ctx.strokeStyle = `rgba(191, 255, 0, ${r.opacity * 0.2})`;
        ctx.lineWidth = 1;
        ctx.stroke();

        r.radius += 12;
        r.opacity -= 0.02;

        if (r.opacity <= 0) {
          ripples.splice(i, 1);
        }
      }

      animationFrameId = requestAnimationFrame(animate);
    };

    animate();

    return () => {
      cancelAnimationFrame(animationFrameId);
      window.removeEventListener("resize", handleResize);
      window.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseleave", handleMouseLeave);
      window.removeEventListener("click", handleClick);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 pointer-events-none z-0"
      style={{ mixBlendMode: "screen" }}
    />
  );
}
