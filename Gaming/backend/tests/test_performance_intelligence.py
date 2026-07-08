import sys
import os
import unittest
import time

sys.path.insert(0, os.path.abspath(os.path.dirname(os.path.dirname(__file__))))

from system.session_recorder import SessionRecorder

class TestPerformanceIntelligence(unittest.TestCase):
    def test_anomalies_and_findings(self):
        recorder = SessionRecorder()
        recorder.start_session("Cyberpunk 2077")

        # 1. Warm-up snapshot (healthy state)
        recorder._last_snapshot_time = 0
        recorder.record_snapshot({
            "capture_fps": 120.0,
            "gpu_metrics": {
                "gpu_util": 80,
                "temperature": 70.0,
                "vram_used_mb": 4000.0,
                "vram_total_mb": 8000.0,
            },
            "cpu_pct": 50.0,
            "cpu_temp": 65.0,
            "scene_type": "exploration",
        })

        # 2. VRAM Saturation snapshot (>90% utilization)
        recorder._last_snapshot_time = 0
        recorder.record_snapshot({
            "capture_fps": 115.0,
            "gpu_metrics": {
                "gpu_util": 85,
                "temperature": 72.0,
                "vram_used_mb": 7500.0,
                "vram_total_mb": 8000.0,  # 93.75%
            },
            "cpu_pct": 52.0,
            "cpu_temp": 68.0,
            "scene_type": "exploration",
        })

        # 3. CPU Thermal Warm snapshot
        recorder._last_snapshot_time = 0
        recorder.record_snapshot({
            "capture_fps": 110.0,
            "gpu_metrics": {
                "gpu_util": 90,
                "temperature": 75.0,
                "vram_used_mb": 7600.0,
                "vram_total_mb": 8000.0,
            },
            "cpu_pct": 85.0,
            "cpu_temp": 82.0,  # Warm (>80)
            "scene_type": "combat",
        })

        # 4. Frame Spike / Drop snapshot (>25% drop from avg of ~115)
        recorder._last_snapshot_time = 0
        recorder.record_snapshot({
            "capture_fps": 55.0,  # Instant drop to 55 FPS
            "gpu_metrics": {
                "gpu_util": 40,
                "temperature": 72.0,
                "vram_used_mb": 7600.0,
                "vram_total_mb": 8000.0,
            },
            "cpu_pct": 90.0,
            "cpu_temp": 83.0,
            "scene_type": "combat",
        })

        summary = recorder.end_session()

        # Check that anomalies were captured in events
        events = summary["events"]
        vram_sat_events = [e for e in events if e["type"] == "vram_saturation"]
        thermal_warm_events = [e for e in events if e["type"] == "thermal_warm"]
        frame_spike_events = [e for e in events if e["type"] == "frame_spike"]

        self.assertTrue(len(vram_sat_events) >= 1, "Should record at least one VRAM saturation anomaly")
        self.assertTrue(len(thermal_warm_events) >= 1, "Should record at least one CPU thermal warning")
        self.assertTrue(len(frame_spike_events) >= 1, "Should record at least one frame spike anomaly")

        # Verify narrative findings were compiled correctly
        findings = summary["findings"]
        self.assertTrue(any("VRAM" in f and "fell" in f or "FPS" in f for f in findings), "Should report FPS drops")
        self.assertTrue(any("temperature reached" in f or "thermal" in f or "optimal" in f for f in findings), "Should report CPU/GPU thermal findings")
        self.assertTrue(any("VRAM saturation" in f for f in findings), "Should suggest VRAM optimization tips")

if __name__ == "__main__":
    unittest.main()
