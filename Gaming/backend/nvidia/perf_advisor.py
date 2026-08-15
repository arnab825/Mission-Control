"""
Multi-Vendor Performance Advisor.
Monitors real-time GPU metrics and recommends enabling/disabling NVIDIA, AMD, and Intel technologies
like DLSS/FSR/XeSS, Ray Tracing, Frame Generation, and Reflex/Anti-Lag based on current performance.
"""
import logging

logger = logging.getLogger(__name__)


class PerformanceAdvisor:
    """
    Provides real-time recommendations for NVIDIA, AMD, and Intel gaming technologies
    based on current GPU metrics and capabilities.
    """

    def __init__(self, capabilities=None, config=None):
        self.capabilities = capabilities
        self.config = config or {}
        
        self._target_fps = self.config.get("fps_cap_limit", self.config.get("target_fps", 60))
        self._fps_low = self.config.get("fps_low_threshold", 45)
        self._fps_critical = self.config.get("fps_critical_threshold", 30)
        self._gpu_util_high = self.config.get("gpu_util_high", 95)
        self._vram_high_pct = self.config.get("vram_high_percent", 85)
        self._temp_warning = self.config.get("temp_warning", 90)
        self._temp_critical = self.config.get("temp_critical", 100)
        
        self._last_recommendations = []
        self._recommendation_cooldowns = {}

    def analyze(self, gpu_metrics, game_fps=None):
        result = {
            "status": "optimal",
            "performance_score": 100,
            "recommendations": [],
            "warnings": [],
            "gpu_summary": self._format_gpu_summary(gpu_metrics),
        }
        
        gpu_util = gpu_metrics.get("gpu_util", 0)
        vram_pct = gpu_metrics.get("vram_percent", 0)
        temp = gpu_metrics.get("temperature", 0)
        vram_used = gpu_metrics.get("vram_used_mb", 0)
        vram_total = gpu_metrics.get("vram_total_mb", 0)
        power = gpu_metrics.get("power_draw_w", 0)
        power_limit = gpu_metrics.get("power_limit_w", 0)
        
        fps = game_fps or 0
        score = 100
        caps = self.capabilities
        
        if fps > 0:
            if fps < self._fps_critical:
                score -= 40
                result["status"] = "critical"
                
                # Frame Generation
                if caps and caps.supports("dlss_3"):
                    result["recommendations"].append({
                        "tech": "DLSS 3 Frame Generation",
                        "action": "ENABLE",
                        "reason": f"FPS critically low ({fps:.0f}). Frame Gen can double your FPS.",
                        "priority": "critical",
                    })
                elif caps and caps.supports("fsr_3"):
                    result["recommendations"].append({
                        "tech": "FSR 3 Frame Generation",
                        "action": "ENABLE",
                        "reason": f"FPS critically low ({fps:.0f}). Frame Gen can double your FPS.",
                        "priority": "critical",
                    })
                elif caps and caps.supports("extrass"):
                    result["recommendations"].append({
                        "tech": "Intel ExtraSS (Frame Gen)",
                        "action": "ENABLE",
                        "reason": f"FPS critically low ({fps:.0f}). ExtraSS generates frames to boost FPS.",
                        "priority": "critical",
                    })
                elif caps and caps.supports("afmf"):
                    result["recommendations"].append({
                        "tech": "AMD Fluid Motion Frames (AFMF)",
                        "action": "ENABLE via Adrenalin",
                        "reason": f"FPS critically low ({fps:.0f}). Driver-level frame generation.",
                        "priority": "critical",
                    })

                # Super Resolution
                if caps and caps.supports("dlss_2"):
                    result["recommendations"].append({
                        "tech": "DLSS Super Resolution",
                        "action": "Set to Performance or Ultra Performance",
                        "reason": f"FPS at {fps:.0f}. DLSS Performance mode upscales by AI.",
                        "priority": "critical",
                    })
                elif caps and caps.supports("xess_1_3"):
                    result["recommendations"].append({
                        "tech": "Intel XeSS",
                        "action": "Set to Performance mode",
                        "reason": f"FPS at {fps:.0f}. XeSS Performance mode significantly boosts FPS.",
                        "priority": "critical",
                    })
                elif caps and caps.supports("fsr_2"):
                    result["recommendations"].append({
                        "tech": "AMD FSR Super Resolution",
                        "action": "Set to Performance mode",
                        "reason": f"FPS at {fps:.0f}. FSR Performance mode boosts frame rates.",
                        "priority": "critical",
                    })
                    
            elif fps < self._fps_low:
                score -= 20
                result["status"] = "warning"
                
                if caps and caps.supports("dlss_2"):
                    result["recommendations"].append({
                        "tech": "DLSS Super Resolution",
                        "action": "Set to Balanced mode",
                        "reason": f"FPS below target ({fps:.0f}/{self._target_fps}).",
                        "priority": "high",
                    })
                elif caps and caps.supports("xess_1_3"):
                    result["recommendations"].append({
                        "tech": "Intel XeSS",
                        "action": "Set to Balanced mode",
                        "reason": f"FPS below target ({fps:.0f}/{self._target_fps}).",
                        "priority": "high",
                    })
                elif caps and caps.supports("fsr_2"):
                    result["recommendations"].append({
                        "tech": "AMD FSR",
                        "action": "Set to Balanced mode",
                        "reason": f"FPS below target ({fps:.0f}/{self._target_fps}).",
                        "priority": "high",
                    })
            
            elif fps >= self._target_fps * 1.5:
                # RT Headroom
                if caps and caps.supports("ray_tracing"):
                    result["recommendations"].append({
                        "tech": "Hardware Ray Tracing",
                        "action": "ENABLE (if game supports it)",
                        "reason": f"FPS headroom ({fps:.0f}fps). Enable RT for better visuals.",
                        "priority": "low",
                    })
                
                # SR Headroom
                if caps and caps.supports("dlss_2"):
                    result["recommendations"].append({"tech": "DLSS Super Resolution", "action": "Try Quality or DLAA mode", "reason": "Enough headroom for max quality upscaling.", "priority": "low"})
                elif caps and caps.supports("xess_1_3"):
                    result["recommendations"].append({"tech": "Intel XeSS", "action": "Try Quality or Ultra Quality mode", "reason": "Enough headroom for max quality upscaling.", "priority": "low"})
                elif caps and caps.supports("fsr_2"):
                    result["recommendations"].append({"tech": "AMD FSR", "action": "Try Quality or Native AA mode", "reason": "Enough headroom for max quality upscaling.", "priority": "low"})
        
        # ── GPU Utilization Analysis ──────────────────────────────
        
        if gpu_util > self._gpu_util_high:
            score -= 10
            if caps and caps.supports("dlss_2"):
                result["recommendations"].append({"tech": "DLSS Super Resolution", "action": "ENABLE", "reason": f"GPU at {gpu_util}% utilization. DLSS reduces load.", "priority": "medium"})
            elif caps and caps.supports("xess_1_3"):
                result["recommendations"].append({"tech": "Intel XeSS", "action": "ENABLE", "reason": f"GPU at {gpu_util}% utilization. XeSS reduces load.", "priority": "medium"})
            elif caps and caps.supports("fsr_2"):
                result["recommendations"].append({"tech": "AMD FSR", "action": "ENABLE", "reason": f"GPU at {gpu_util}% utilization. FSR reduces load.", "priority": "medium"})
        
        # ── VRAM Analysis ─────────────────────────────────────────
        
        if vram_pct > self._vram_high_pct:
            score -= 15
            result["warnings"].append({
                "type": "vram_pressure",
                "message": f"VRAM usage high: {vram_used}MB / {vram_total}MB ({vram_pct:.0f}%). "
                          f"Reduce texture quality or resolution.",
                "priority": "high",
            })
            if caps:
                sr_tech = "DLSS" if caps.supports("dlss_2") else "XeSS" if caps.supports("xess_1_3") else "FSR" if caps.supports("fsr_2") else None
                if sr_tech:
                    result["recommendations"].append({
                        "tech": f"{sr_tech} Super Resolution",
                        "action": "ENABLE — reduces VRAM usage",
                        "reason": f"VRAM at {vram_pct:.0f}%. Renders at lower internal resolution.",
                        "priority": "high",
                    })
        
        # ── Temperature Analysis ──────────────────────────────────
        
        if temp > self._temp_critical:
            score -= 30
            result["status"] = "critical"
            result["warnings"].append({
                "type": "thermal_critical",
                "message": f"GPU temperature CRITICAL: {temp}°C! GPU will thermal throttle.",
                "priority": "critical",
            })
        elif temp > self._temp_warning:
            score -= 10
            result["warnings"].append({
                "type": "thermal_warning",
                "message": f"GPU temperature elevated: {temp}°C. Consider improving airflow.",
                "priority": "medium",
            })
        
        # ── Power Analysis ────────────────────────────────────────
        
        if power_limit > 0 and power > power_limit * 0.95:
            score -= 5
            result["warnings"].append({
                "type": "power_limit",
                "message": f"GPU near power limit ({power:.0f}W / {power_limit:.0f}W).",
                "priority": "low",
            })
             
        # ── Latency Recommendation (Reflex / Anti-Lag) ────────────────
        
        has_fg_enabled = False # We'd need to know if FG is actually enabled, but we can recommend
        
        if caps and caps.supports("reflex"):
            if fps and fps < self._target_fps:
                result["recommendations"].append({
                    "tech": "NVIDIA Reflex",
                    "action": "ENABLE (+ Boost mode for competitive)",
                    "reason": "Reduces input latency. Essential for competitive play.",
                    "priority": "medium",
                })
        elif caps and caps.supports("anti_lag_2"):
            if fps and fps < self._target_fps:
                result["recommendations"].append({
                    "tech": "Radeon Anti-Lag 2",
                    "action": "ENABLE in-game",
                    "reason": "Reduces input-to-response latency.",
                    "priority": "medium",
                })
        elif caps and caps.supports("anti_lag"):
            if fps and fps < self._target_fps:
                result["recommendations"].append({
                    "tech": "Radeon Anti-Lag",
                    "action": "ENABLE in Adrenalin",
                    "reason": "Driver-level latency reduction.",
                    "priority": "medium",
                })
        
        # ── SmoothSync (Intel) ──────────────────────────────────
        if caps and caps.supports("smooth_sync"):
            result["recommendations"].append({
                "tech": "Intel SmoothSync",
                "action": "ENABLE in Arc Control",
                "reason": "Blurs screen tearing boundaries for a smoother VSync-off experience.",
                "priority": "low",
            })
        
        # ── Video Features ─────────────────────────────────────────────
        
        if caps and caps.supports("rtx_video_sr"):
            result["recommendations"].append({
                "tech": "RTX Video Super Resolution",
                "action": "ENABLE in NVIDIA Control Panel",
                "reason": "Enhances video stream quality using AI.",
                "priority": "low",
            })
        
        # ── Path Tracing ──────────────────────────────────────────
        
        if caps and caps.supports("ray_tracing") and caps.vendor == "nvidia" and fps and fps > self._target_fps * 2:
            result["recommendations"].append({
                "tech": "Full Path Tracing",
                "action": "Try enabling (if game supports it)",
                "reason": "Your GPU supports full path tracing with ample FPS headroom.",
                "priority": "low",
            })
        
        result["performance_score"] = max(0, min(100, score))
        
        seen = set()
        deduped = []
        for rec in result["recommendations"]:
            key = rec["tech"]
            if key not in seen:
                seen.add(key)
                deduped.append(rec)
        result["recommendations"] = deduped
        
        self._last_recommendations = result["recommendations"]
        return result

    def get_full_analysis(self, gpu_metrics, game_fps=None):
        analysis = self.analyze(gpu_metrics, game_fps)
        analysis.setdefault("status", "unknown")
        analysis.setdefault("performance_score", 100)
        analysis.setdefault("recommendations", [])
        analysis.setdefault("warnings", [])
        analysis.setdefault("gpu_summary", "")
        return analysis

    def get_quick_tip(self, gpu_metrics, game_fps=None):
        analysis = self.analyze(gpu_metrics, game_fps)
        
        for w in analysis["warnings"]:
            if w["priority"] in ("critical",):
                return f"⚠️ {w['message'][:80]}"
        
        for rec in analysis["recommendations"]:
            if rec["priority"] in ("critical", "high"):
                return f"💡 {rec['tech']}: {rec['action']}"
        
        if analysis["performance_score"] >= 80:
            return "✅ Performance optimal"
        
        return ""

    def get_settings_preset(self, gpu_metrics, game_fps=None, game_name=None):
        caps = self.capabilities
        if not caps:
            return {"note": "GPU capabilities not detected"}
        
        fps = game_fps or 0
        vram = caps.vram_mb
        
        preset = {
            "display_mode": "borderless",
            "resolution_scale": "native",
            "upscaler": "off",
            "ray_tracing": "off",
            "latency_reduction": "off",
            "frame_generation": "off",
            "texture_quality": "high",
        }
        
        intensity = "standard"
        if game_name:
            game_lower = game_name.lower()
            tags_to_check = ""
            
            try:
                from system.game_scanner import GameScanner
                scanner = GameScanner()
                games = scanner.load_cached_games()
                if games:
                    for g in games:
                        g_name = g.get("name", "").lower()
                        if game_lower == g_name or game_lower in g_name:
                            tags_to_check += g.get("genre", "").lower() + " "
                            tags_to_check += " ".join(t.lower() for t in g.get("tags", []))
                            break
            except Exception:
                pass
                
            if not tags_to_check.strip():
                try:
                    from ai_brain.web_search import WebSearchEngine
                    search = WebSearchEngine()
                    res = search.search(game_name, task="game_info", game_name=game_name)
                    ans = res.get("answer", "").lower()
                    if ans:
                        tags_to_check += " " + ans
                except Exception:
                    pass
            
            if tags_to_check:
                heavy_keywords = ["open world", "rpg", "narrative", "demanding", "aaa", "story rich", "graphics", "cyberpunk"]
                light_keywords = ["esports", "competitive", "multiplayer", "shooter", "moba", "platformer", "pixel graphics", "2d", "indie", "tactical shooter", "hero shooter"]
                
                if any(kw in tags_to_check for kw in heavy_keywords):
                    intensity = "heavy"
                elif any(kw in tags_to_check for kw in light_keywords):
                    intensity = "light"
        
        vram_ultra = 12000
        vram_high = 8000
        vram_medium = 4000
        
        if intensity == "heavy":
            vram_ultra += 4000
            vram_high += 2000
            vram_medium += 2000
        elif intensity == "light":
            vram_ultra = 6000
            vram_high = 4000
            vram_medium = 2000

        if vram >= vram_ultra:
            preset["texture_quality"] = "ultra"
        elif vram >= vram_high:
            preset["texture_quality"] = "high"
        elif vram >= vram_medium:
            preset["texture_quality"] = "medium"
        else:
            preset["texture_quality"] = "low"
        
        # Upscaler
        if caps.supports("dlss_2"): preset["upscaler"] = "dlss"
        elif caps.supports("xess_1_3"): preset["upscaler"] = "xess"
        elif caps.supports("fsr_2"): preset["upscaler"] = "fsr"
        
        if preset["upscaler"] != "off":
            if fps > 0 and fps >= self._target_fps:
                preset["upscaler_mode"] = "quality"
            elif fps > 0 and fps >= self._fps_low:
                preset["upscaler_mode"] = "balanced"
            else:
                preset["upscaler_mode"] = "performance"
        
        # Ray Tracing
        if caps.supports("ray_tracing"):
            if fps > 0 and fps >= self._target_fps:
                preset["ray_tracing"] = "medium"
            if preset["upscaler"] != "off" and (fps == 0 or fps >= self._fps_low):
                preset["ray_tracing"] = "high"
        
        # Frame Generation
        if caps.supports("dlss_3"): preset["frame_generation"] = "dlss_fg"
        elif caps.supports("fsr_3"): preset["frame_generation"] = "fsr_fg"
        elif caps.supports("extrass"): preset["frame_generation"] = "extrass"
        
        # Latency
        if caps.supports("reflex"): preset["latency_reduction"] = "reflex"
        elif caps.supports("anti_lag_2"): preset["latency_reduction"] = "anti_lag_2"
        elif caps.supports("anti_lag"): preset["latency_reduction"] = "anti_lag"
        
        return preset

    @staticmethod
    def _format_gpu_summary(metrics):
        return (
            f"{metrics.get('gpu_name', '?')} | "
            f"GPU: {metrics.get('gpu_util', 0)}% | "
            f"VRAM: {metrics.get('vram_used_mb', 0)}/{metrics.get('vram_total_mb', 0)}MB | "
            f"Temp: {metrics.get('temperature', 0)}°C | "
            f"Power: {metrics.get('power_draw_w', 0):.0f}W"
        )


if __name__ == "__main__":
    from nvidia.capabilities import GPUCapabilities
    from nvidia.gpu_monitor import GPUMonitor
    
    caps = GPUCapabilities()
    caps.print_report()
    
    monitor = GPUMonitor()
    metrics = monitor.poll_once()
    
    advisor = PerformanceAdvisor(capabilities=caps)
    result = advisor.analyze(metrics, game_fps=45)
    
    print(f"\nPerformance Score: {result['performance_score']}/100")
    print(f"Status: {result['status']}")
    print(f"GPU: {result['gpu_summary']}")
    
    if result["warnings"]:
        print("\n⚠️  Warnings:")
        for w in result["warnings"]:
            print(f"  [{w['priority']}] {w['message']}")
    
    if result["recommendations"]:
        print("\n💡 Recommendations:")
        for r in result["recommendations"]:
            print(f"  [{r['priority']}] {r['tech']}: {r['action']}")
            print(f"    → {r['reason']}")
