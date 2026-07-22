"""
NVIDIA performance advisor.
Monitors real-time GPU metrics and recommends enabling/disabling NVIDIA technologies
like DLSS, Ray Tracing, Frame Generation, and Reflex based on current performance.
"""
import logging

logger = logging.getLogger(__name__)


class PerformanceAdvisor:
    """
    Provides real-time recommendations for NVIDIA gaming technologies
    based on current GPU metrics and capabilities.
    
    Analyzes FPS, GPU utilization, VRAM pressure, and temperature to suggest:
    - When to enable/disable DLSS and at what quality level
    - Whether Ray Tracing is viable at current performance
    - When Frame Generation would help
    - When Reflex should be enabled for latency
    - Optimal resolution scaling
    """

    # DLSS quality modes ordered from highest quality to highest performance
    DLSS_MODES = ["native", "dlaa", "quality", "balanced", "performance", "ultra_performance"]

    def __init__(self, capabilities=None, config=None):
        """
        :param capabilities: GPUCapabilities instance
        :param config: dict with advisor thresholds
        """
        self.capabilities = capabilities
        self.config = config or {}
        
        self._target_fps = self.config.get("fps_cap_limit", self.config.get("target_fps", 60))
        self._fps_low = self.config.get("fps_low_threshold", 45)
        self._fps_critical = self.config.get("fps_critical_threshold", 30)
        self._gpu_util_high = self.config.get("gpu_util_high", 95)
        self._vram_high_pct = self.config.get("vram_high_percent", 85)
        self._temp_warning = self.config.get("temp_warning", 90)
        self._temp_critical = self.config.get("temp_critical", 100)
        
        # Track recommendation history to avoid spamming
        self._last_recommendations = []
        self._recommendation_cooldowns = {}

    def analyze(self, gpu_metrics, game_fps=None):
        """
        Analyze current performance and return recommendations.
        
        :param gpu_metrics: dict from GPUMonitor.metrics
        :param game_fps: Measured in-game FPS (if available, more accurate than capture FPS)
        :returns: dict with 'status', 'recommendations', 'warnings'
        """
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
        
        # ── FPS Analysis ──────────────────────────────────────────
        
        if fps > 0:
            if fps < self._fps_critical:
                score -= 40
                result["status"] = "critical"
                
                if caps and caps.supports("dlss_3"):
                    result["recommendations"].append({
                        "tech": "DLSS 3 Frame Generation",
                        "action": "ENABLE",
                        "reason": f"FPS critically low ({fps:.0f}). Frame Gen can double your FPS.",
                        "priority": "critical",
                    })
                if caps and caps.supports("dlss_2"):
                    result["recommendations"].append({
                        "tech": "DLSS Super Resolution",
                        "action": "Set to Performance or Ultra Performance",
                        "reason": f"FPS at {fps:.0f}. DLSS Performance mode renders at half resolution, upscaled by AI.",
                        "priority": "critical",
                    })
                    
            elif fps < self._fps_low:
                score -= 20
                result["status"] = "warning"
                
                if caps and caps.supports("dlss_2"):
                    result["recommendations"].append({
                        "tech": "DLSS Super Resolution",
                        "action": "Set to Balanced mode",
                        "reason": f"FPS below target ({fps:.0f}/{self._target_fps}). DLSS Balanced gives good quality with ~50% FPS boost.",
                        "priority": "high",
                    })
            
            elif fps >= self._target_fps * 1.5:
                # Lots of FPS headroom — can afford to turn on RT
                if caps and caps.supports("ray_tracing"):
                    result["recommendations"].append({
                        "tech": "Ray Tracing",
                        "action": "ENABLE (if game supports it)",
                        "reason": f"FPS headroom ({fps:.0f}fps). Enable RT for better visuals.",
                        "priority": "low",
                    })
                if caps and caps.supports("dlss_2"):
                    result["recommendations"].append({
                        "tech": "DLSS Super Resolution",
                        "action": "Try Quality or DLAA mode",
                        "reason": "Enough headroom for max quality upscaling.",
                        "priority": "low",
                    })
        
        # ── GPU Utilization Analysis ──────────────────────────────
        
        if gpu_util > self._gpu_util_high:
            score -= 10
            if caps and caps.supports("dlss_2"):
                result["recommendations"].append({
                    "tech": "DLSS Super Resolution",
                    "action": "ENABLE or increase performance level",
                    "reason": f"GPU at {gpu_util}% utilization — GPU-bound. DLSS reduces rendering load.",
                    "priority": "medium",
                })
        
        # ── VRAM Analysis ─────────────────────────────────────────
        
        if vram_pct > self._vram_high_pct:
            score -= 15
            result["warnings"].append({
                "type": "vram_pressure",
                "message": f"VRAM usage high: {vram_used}MB / {vram_total}MB ({vram_pct:.0f}%). "
                          f"Reduce texture quality or resolution to prevent stuttering.",
                "priority": "high",
            })
            if caps and caps.supports("dlss_2"):
                result["recommendations"].append({
                    "tech": "DLSS Super Resolution",
                    "action": "ENABLE — reduces VRAM usage",
                    "reason": f"VRAM at {vram_pct:.0f}%. DLSS renders at lower internal resolution, using less VRAM.",
                    "priority": "high",
                })
        
        # ── Temperature Analysis ──────────────────────────────────
        
        if temp > self._temp_critical:
            score -= 30
            result["status"] = "critical"
            result["warnings"].append({
                "type": "thermal_critical",
                "message": f"GPU temperature CRITICAL: {temp}°C! GPU will thermal throttle. "
                          f"Improve cooling or reduce settings immediately.",
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
                "message": f"GPU near power limit ({power:.0f}W / {power_limit:.0f}W). "
                          f"May be power throttling.",
                "priority": "low",
            })
        
        # ── Frame Gen Recommendation ────────────────────────────────
        
        if caps and caps.supports("dlss_4_5"):
             result["recommendations"].append({
                 "tech": "DLSS 4.5 (Dynamic Frame Gen)",
                 "action": "ENABLE",
                 "reason": "Dynamic FG intelligently scales frame generation based on scene complexity, providing smooth motion with optimized latency.",
                 "priority": "high",
             })
        elif caps and caps.supports("dlss_3"):
             pass # Kept in critical section
             
        # ── Reflex Recommendation ─────────────────────────────────
        
        if caps and caps.supports("reflex"):
            if caps.supports("dlss_3"):
                result["recommendations"].append({
                    "tech": "NVIDIA Reflex",
                    "action": "ALWAYS ENABLE with Frame Generation",
                    "reason": "Frame Gen adds latency. Reflex compensates, keeping input response crisp.",
                    "priority": "high",
                })
            elif fps and fps < self._target_fps:
                result["recommendations"].append({
                    "tech": "NVIDIA Reflex",
                    "action": "ENABLE (+ Boost mode for competitive)",
                    "reason": "Reduces input latency by up to 50%. Essential for competitive play.",
                    "priority": "medium",
                })
        
        # ── RTX Video ─────────────────────────────────────────────
        
        if caps and caps.supports("rtx_video_sr"):
            result["recommendations"].append({
                "tech": "RTX Video Super Resolution",
                "action": "ENABLE in NVIDIA Control Panel",
                "reason": "Enhances video stream quality using AI. Perfect for watching walkthroughs or streaming.",
                "priority": "low",
            })
        
        # ── Path Tracing ──────────────────────────────────────────
        
        if caps and caps.supports("path_tracing"):
            if fps and fps > self._target_fps * 2:
                result["recommendations"].append({
                    "tech": "Full Path Tracing",
                    "action": "Try enabling (if game supports it)",
                    "reason": "Your GPU supports full path tracing with ample FPS headroom. "
                             "Enable for photorealistic lighting (Cyberpunk 2077, Portal RTX, etc.).",
                    "priority": "low",
                })
        
        # ── Final Score ───────────────────────────────────────────
        
        result["performance_score"] = max(0, min(100, score))
        
        # Deduplicate recommendations by tech
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
        """
        Returns the complete analysis dict for the session dashboard.
        Same as analyze() but guaranteed to include all fields.
        """
        analysis = self.analyze(gpu_metrics, game_fps)
        # Ensure all expected keys exist for frontend consumption
        analysis.setdefault("status", "unknown")
        analysis.setdefault("performance_score", 100)
        analysis.setdefault("recommendations", [])
        analysis.setdefault("warnings", [])
        analysis.setdefault("gpu_summary", "")
        return analysis

    def get_quick_tip(self, gpu_metrics, game_fps=None):
        """
        Get a single-line quick tip for the overlay.
        Returns the highest-priority recommendation as a short string.
        """
        analysis = self.analyze(gpu_metrics, game_fps)
        
        # Warnings first
        for w in analysis["warnings"]:
            if w["priority"] in ("critical",):
                return f"⚠️ {w['message'][:80]}"
        
        # Then recommendations
        for rec in analysis["recommendations"]:
            if rec["priority"] in ("critical", "high"):
                return f"💡 {rec['tech']}: {rec['action']}"
        
        if analysis["performance_score"] >= 80:
            return "✅ Performance optimal"
        
        return ""

    def get_settings_preset(self, gpu_metrics, game_fps=None, game_name=None):
        """
        Suggest a complete settings preset based on current GPU and performance.
        Returns a dict of recommended settings.
        """
        caps = self.capabilities
        if not caps:
            return {"note": "GPU capabilities not detected"}
        
        fps = game_fps or 0
        vram = caps.vram_mb
        
        preset = {
            "display_mode": "borderless",
            "resolution_scale": "native",
            "dlss_mode": "off",
            "ray_tracing": "off",
            "reflex": "off",
            "frame_generation": "off",
            "texture_quality": "high",
        }
        
        # Determine base preset from VRAM, FPS, and game intensity
        intensity = "standard"
        if game_name:
            game_lower = game_name.lower()
            
            # Try to get classification from Game Library or Web Search
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
                
            # Fallback to Web Search Engine if local library doesn't have it or tags are empty
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
            
            # Determine intensity based on collected tags and text
            if tags_to_check:
                heavy_keywords = ["open world", "rpg", "narrative", "demanding", "aaa", "story rich", "graphics", "cyberpunk"]
                light_keywords = ["esports", "competitive", "multiplayer", "shooter", "moba", "platformer", "pixel graphics", "2d", "indie", "tactical shooter", "hero shooter"]
                
                # Check heavy first, as modern multiplayer RPGs are still heavy
                if any(kw in tags_to_check for kw in heavy_keywords):
                    intensity = "heavy"
                elif any(kw in tags_to_check for kw in light_keywords):
                    intensity = "light"
        
        # Adjust VRAM requirements based on game intensity
        vram_ultra = 12000
        vram_high = 8000
        vram_medium = 4000
        
        if intensity == "heavy":
            vram_ultra += 4000  # Needs 16GB for Ultra
            vram_high += 2000   # Needs 10GB for High
            vram_medium += 2000 # Needs 6GB for Medium
        elif intensity == "light":
            vram_ultra = 6000   # 6GB is enough for Ultra
            vram_high = 4000    # 4GB is enough for High
            vram_medium = 2000  # 2GB is enough for Medium

        if vram >= vram_ultra:
            preset["texture_quality"] = "ultra"
        elif vram >= vram_high:
            preset["texture_quality"] = "high"
        elif vram >= vram_medium:
            preset["texture_quality"] = "medium"
        else:
            preset["texture_quality"] = "low"
        
        # DLSS
        if caps.supports("dlss_2"):
            if fps > 0 and fps >= self._target_fps:
                preset["dlss_mode"] = "quality"  # Can afford high quality
            elif fps > 0 and fps >= self._fps_low:
                preset["dlss_mode"] = "balanced"
            else:
                preset["dlss_mode"] = "performance"
        
        # Ray Tracing
        if caps.supports("ray_tracing"):
            if fps > 0 and fps >= self._target_fps:
                preset["ray_tracing"] = "medium"
            if caps.supports("dlss_2") and (fps == 0 or fps >= self._fps_low):
                preset["ray_tracing"] = "high"  # DLSS compensates
        
        # Frame Generation
        if caps.supports("dlss_3"):
            preset["frame_generation"] = "on"
        
        # Reflex
        if caps.supports("reflex"):
            preset["reflex"] = "on"
        
        return preset

    @staticmethod
    def _format_gpu_summary(metrics):
        """Format GPU metrics into a brief summary string."""
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
