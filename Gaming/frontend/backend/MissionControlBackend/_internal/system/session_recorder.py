"""
Session Recorder — Records telemetry snapshots during gameplay
and generates aggregate performance summaries on session end.

Persists session data to SQLite via GameMemory for the post-game dashboard.
"""

import logging
import time
from collections import defaultdict
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class SessionRecorder:
    """
    Records periodic telemetry snapshots during active gameplay,
    then computes aggregate statistics when the session ends.
    """

    def __init__(self):
        self._active = False
        self._game_name: str = ""
        self._game_pid: Optional[int] = None
        self._start_time: float = 0.0
        self._end_time: float = 0.0
        self._snapshots: List[Dict[str, Any]] = []
        self._events: List[Dict[str, Any]] = []  # crash/hang/optimization events
        self._last_snapshot_time: float = 0.0
        self._snapshot_interval: float = 5.0  # Record every 5 seconds

    @property
    def is_active(self) -> bool:
        return self._active

    def start_session(self, game_name: str, game_pid: Optional[int] = None):
        """Initialize a new recording session."""
        self._active = True
        self._game_name = game_name
        self._game_pid = game_pid
        self._start_time = time.time()
        self._end_time = 0.0
        self._snapshots = []
        self._events = []
        self._last_snapshot_time = 0.0
        logger.info(f"[SessionRecorder] Started session for '{game_name}' (PID: {game_pid})")

    def record_snapshot(self, game_state: Dict[str, Any]):
        """
        Record a telemetry snapshot from the current game state.
        Should be called from the telemetry loop; auto-throttles to the snapshot interval.
        """
        if not self._active:
            return

        now = time.time()
        if (now - self._last_snapshot_time) < self._snapshot_interval:
            return

        self._last_snapshot_time = now

        gpu_metrics = game_state.get("gpu_metrics", {}) or {}
        snapshot = {
            "timestamp": now,
            "capture_fps": game_state.get("capture_fps", 0.0),
            "vision_fps": game_state.get("vision_fps", 0.0),
            "gpu_util": gpu_metrics.get("gpu_util", 0),
            "gpu_temp": gpu_metrics.get("temperature", 0),
            "vram_used_mb": gpu_metrics.get("vram_used_mb", 0),
            "vram_total_mb": gpu_metrics.get("vram_total_mb", 0),
            "cpu_pct": game_state.get("cpu_pct", 0),
            "cpu_temp": game_state.get("cpu_temp", 0),
            "mem_pct": game_state.get("mem_pct", 0),
            "scene_type": game_state.get("scene_type", "unknown"),
            "perf_score": game_state.get("perf_score", 100),
            "one_percent_low": game_state.get("one_percent_low", 0.0),
        }
        self._snapshots.append(snapshot)

        # Real-time Anomaly Detection
        capture_fps = game_state.get("capture_fps", 0.0)
        one_percent_low = game_state.get("one_percent_low", 0.0)
        gpu_temp = gpu_metrics.get("temperature", 0.0)
        vram_used = gpu_metrics.get("vram_used_mb", 0.0)
        vram_total = gpu_metrics.get("vram_total_mb", 0.0)
        cpu_pct = game_state.get("cpu_pct", 0.0)
        cpu_temp = game_state.get("cpu_temp", 0.0)
        scene_type = game_state.get("scene_type", "unknown")

        # Calculate running average of capture_fps from previous snapshots
        fps_values = [s["capture_fps"] for s in self._snapshots[:-1] if s["capture_fps"] > 0]
        running_avg = sum(fps_values) / len(fps_values) if fps_values else 0.0

        anomalies_detected = []

        # 1. Frame Spikes
        if one_percent_low > 0 and one_percent_low < 60:
            anomalies_detected.append({
                "type": "frame_spike",
                "message": f"1% low FPS fell to {one_percent_low:.1f} (below 60 FPS)",
                "metric": "fps_1percent_low",
                "value": one_percent_low
            })
        elif capture_fps > 0 and running_avg > 0 and capture_fps < 0.75 * running_avg:
            anomalies_detected.append({
                "type": "frame_spike",
                "message": f"Instant FPS dropped to {capture_fps:.1f} (over 25% below running average of {running_avg:.1f})",
                "metric": "capture_fps",
                "value": capture_fps
            })

        # 2. Thermal Warmth/Critical
        if cpu_temp >= 88:
            anomalies_detected.append({
                "type": "thermal_critical",
                "message": f"CPU temperature reached critical {cpu_temp}°C",
                "metric": "cpu_temp",
                "value": cpu_temp
            })
        elif cpu_temp >= 80:
            anomalies_detected.append({
                "type": "thermal_warm",
                "message": f"CPU temperature warmed to {cpu_temp}°C",
                "metric": "cpu_temp",
                "value": cpu_temp
            })

        if gpu_temp >= 88:
            anomalies_detected.append({
                "type": "thermal_critical",
                "message": f"GPU temperature reached critical {gpu_temp}°C",
                "metric": "gpu_temp",
                "value": gpu_temp
            })
        elif gpu_temp >= 80:
            anomalies_detected.append({
                "type": "thermal_warm",
                "message": f"GPU temperature warmed to {gpu_temp}°C",
                "metric": "gpu_temp",
                "value": gpu_temp
            })

        # 3. VRAM Saturation
        vram_pct = (vram_used / vram_total * 100) if vram_total > 0 else 0.0
        if vram_pct > 90.0:
            anomalies_detected.append({
                "type": "vram_saturation",
                "message": f"VRAM usage exceeded 90% ({vram_used:.0f}MB / {vram_total:.0f}MB)",
                "metric": "vram_pct",
                "value": vram_pct
            })

        # Record events
        for anomaly in anomalies_detected:
            quest_texts = game_state.get("quest_texts", [])
            dialogue_text = game_state.get("dialogue_text", "")
            position = game_state.get("position", "Unknown")

            event_data = {
                "message": anomaly["message"],
                "metric": anomaly["metric"],
                "value": anomaly["value"],
                "scene_type": scene_type,
                "location": position,
                "active_quests": quest_texts,
                "dialogue": dialogue_text,
                "hardware_metrics": {
                    "capture_fps": capture_fps,
                    "cpu_pct": cpu_pct,
                    "cpu_temp": cpu_temp,
                    "gpu_util": gpu_metrics.get("gpu_util", 0),
                    "gpu_temp": gpu_temp,
                    "vram_used_mb": vram_used,
                    "vram_total_mb": vram_total,
                }
            }
            # Deduplicate anomalies occurring in the same 30-second window
            last_matching = next((e for e in reversed(self._events) if e["type"] == anomaly["type"]), None)
            if last_matching and (now - last_matching["timestamp"] < 30) and last_matching["data"].get("scene_type") == scene_type:
                continue

            self.record_event(anomaly["type"], event_data)

    def record_event(self, event_type: str, data: Optional[Dict] = None):
        """Record a discrete event (crash, hang, optimization applied, etc.)."""
        if not self._active:
            return
        self._events.append({
            "type": event_type,
            "timestamp": time.time(),
            "data": data or {},
        })

    def end_session(self) -> Optional[Dict[str, Any]]:
        """Finalize the session and compute aggregate statistics."""
        if not self._active:
            return None
        self._active = False
        self._end_time = time.time()
        logger.info(f"[SessionRecorder] Ended session for '{self._game_name}' "
                     f"({len(self._snapshots)} snapshots over {self._end_time - self._start_time:.0f}s)")
        return self.get_summary_dict()

    def get_summary_dict(self) -> Dict[str, Any]:
        """Compute and return the full session summary as a JSON-serializable dict."""
        duration = (self._end_time or time.time()) - self._start_time

        if not self._snapshots:
            return {
                "game_name": self._game_name,
                "start_time": self._start_time,
                "end_time": self._end_time,
                "duration_secs": duration,
                "snapshot_count": 0,
                "fps": {},
                "gpu": {},
                "cpu": {},
                "memory": {},
                "scenes": {},
                "events": self._events,
                "perf_score_avg": 100,
                "findings": [],
            }

        # ── FPS Statistics ──────────────────────────────────────────
        fps_values = [s["capture_fps"] for s in self._snapshots if s["capture_fps"] > 0]
        fps_stats = self._compute_stats(fps_values, "FPS")

        # ── GPU Statistics ──────────────────────────────────────────
        gpu_utils = [s["gpu_util"] for s in self._snapshots]
        gpu_temps = [s["gpu_temp"] for s in self._snapshots if s["gpu_temp"] > 0]
        vram_used = [s["vram_used_mb"] for s in self._snapshots if s["vram_used_mb"] > 0]
        vram_total = max((s["vram_total_mb"] for s in self._snapshots), default=0)

        gpu_stats = {
            "utilization": self._compute_stats(gpu_utils, "GPU Util"),
            "temperature": self._compute_stats(gpu_temps, "GPU Temp"),
            "vram_used_mb": self._compute_stats(vram_used, "VRAM"),
            "vram_total_mb": vram_total,
        }

        # ── CPU Statistics ──────────────────────────────────────────
        cpu_pcts = [s["cpu_pct"] for s in self._snapshots if s["cpu_pct"] > 0]
        cpu_temps = [s["cpu_temp"] for s in self._snapshots if s["cpu_temp"] > 0]
        cpu_stats = {
            "utilization": self._compute_stats(cpu_pcts, "CPU Util"),
            "temperature": self._compute_stats(cpu_temps, "CPU Temp"),
        }

        # ── Memory ──────────────────────────────────────────────────
        mem_pcts = [s["mem_pct"] for s in self._snapshots if s["mem_pct"] > 0]
        mem_stats = self._compute_stats(mem_pcts, "Memory")

        # ── Scene Distribution ──────────────────────────────────────
        scene_counts: Dict[str, int] = defaultdict(int)
        for s in self._snapshots:
            scene_counts[s["scene_type"]] += 1
        total_scenes = len(self._snapshots)
        scene_distribution = {
            k: round(v / total_scenes * 100, 1)
            for k, v in sorted(scene_counts.items(), key=lambda x: -x[1])
        }

        # ── Performance Score ───────────────────────────────────────
        perf_scores = [s["perf_score"] for s in self._snapshots]
        perf_avg = sum(perf_scores) / len(perf_scores) if perf_scores else 100

        findings = self._generate_findings(duration)

        return {
            "game_name": self._game_name,
            "start_time": self._start_time,
            "end_time": self._end_time,
            "duration_secs": round(duration, 1),
            "snapshot_count": len(self._snapshots),
            "fps": fps_stats,
            "gpu": gpu_stats,
            "cpu": cpu_stats,
            "memory": mem_stats,
            "scenes": scene_distribution,
            "events": self._events,
            "perf_score_avg": round(perf_avg, 1),
            "findings": findings,
        }

    def _generate_findings(self, duration: float) -> List[str]:
        findings = []
        if not self._snapshots:
            return findings

        # Compute stats / analyze anomalies
        valid_snapshots = [s for s in self._snapshots if s.get("capture_fps", 0.0) > 0]
        min_fps_snap = min(valid_snapshots, key=lambda s: s["capture_fps"]) if valid_snapshots else None

        # Finding 1: Min FPS spike context
        if min_fps_snap:
            min_fps = min_fps_snap["capture_fps"]
            scene = min_fps_snap["scene_type"]
            vram_u = min_fps_snap.get("vram_used_mb", 0)
            vram_t = min_fps_snap.get("vram_total_mb", 0)
            v_pct = round(vram_u / vram_t * 100, 1) if vram_t > 0 else 0.0

            if min_fps < 60:
                findings.append(f"FPS fell to {min_fps:.1f} during {scene} (saturating VRAM at {v_pct}%).")
            else:
                findings.append(f"Game stabilized with a minimum of {min_fps:.1f} FPS during {scene} gameplay.")

        # Finding 2: CPU/GPU temps
        max_cpu_temp = max((s.get("cpu_temp", 0) for s in self._snapshots), default=0)
        max_gpu_temp = max((s.get("gpu_temp", 0) for s in self._snapshots), default=0)
        duration_mins = round(duration / 60.0, 1)

        if max_cpu_temp >= 80 or max_gpu_temp >= 80:
            findings.append(f"CPU temperature reached {max_cpu_temp}°C and GPU reached {max_gpu_temp}°C during {duration_mins} mins of active gameplay.")
        else:
            findings.append(f"Thermal levels remained optimal (CPU max: {max_cpu_temp}°C, GPU max: {max_gpu_temp}°C) over {duration_mins} mins.")

        # Finding 3: Shader compilation or asset streaming during loading
        loading_spikes = [
            e for e in self._events
            if e["type"] == "frame_spike" and e["data"].get("scene_type") == "loading"
        ]
        if loading_spikes:
            findings.append("Shader compilation or asset streaming detected during loading transitions.")
        elif any(e["type"] == "frame_spike" for e in self._events):
            combat_spikes = [e for e in self._events if e["type"] == "frame_spike" and e["data"].get("scene_type") == "combat"]
            if combat_spikes:
                findings.append("Frequent frame rate spikes observed during intense combat, suggesting possible CPU throttling or asset streaming delay.")
            else:
                findings.append("Minor frametime spikes observed during scene transitions.")

        # Finding 4: VRAM Saturation recommendations
        vram_saturations = [e for e in self._events if e["type"] == "vram_saturation"]
        if vram_saturations:
            findings.append("High VRAM saturation (>90%) detected. Consider lowering texture resolutions or shadow quality to prevent stuttering.")

        if not findings:
            findings.append("Performance was stable with no major bottlenecks or anomalies detected.")

        return findings

    def save_to_db(self, memory, user_id: str = "guest"):
        """Persist the session summary to the GameMemory SQLite database."""
        if not memory:
            return
        try:
            summary = self.get_summary_dict()
            memory.save_game_session(summary, user_id=user_id)
            logger.info(f"[SessionRecorder] Session saved to DB for '{self._game_name}'")
        except Exception as e:
            logger.error(f"[SessionRecorder] Failed to save session to DB: {e}")

    @staticmethod
    def _compute_stats(values: List[float], label: str = "") -> Dict[str, float]:
        """Compute min/max/avg/p1/p99 for a list of values."""
        if not values:
            return {"avg": 0, "min": 0, "max": 0, "p1": 0, "p99": 0, "count": 0}

        sorted_vals = sorted(values)
        n = len(sorted_vals)
        p1_idx = max(0, int(n * 0.01))
        p99_idx = min(n - 1, int(n * 0.99))

        return {
            "avg": round(sum(values) / n, 1),
            "min": round(sorted_vals[0], 1),
            "max": round(sorted_vals[-1], 1),
            "p1": round(sorted_vals[p1_idx], 1),
            "p99": round(sorted_vals[p99_idx], 1),
            "count": n,
        }
