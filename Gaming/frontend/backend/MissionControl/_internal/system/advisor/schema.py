from dataclasses import dataclass
from enum import Enum, auto
from typing import Any, Dict, Optional

class SeverityLevel(Enum):
    INFORMATIONAL = "Informational"
    RECOMMENDATION = "Recommendation"
    WARNING = "Warning"
    CRITICAL = "Critical"

    def __lt__(self, other):
        # Allow sorting by severity: CRITICAL > WARNING > RECOMMENDATION > INFORMATIONAL
        order = {
            SeverityLevel.INFORMATIONAL: 0,
            SeverityLevel.RECOMMENDATION: 1,
            SeverityLevel.WARNING: 2,
            SeverityLevel.CRITICAL: 3,
        }
        return order[self] < order[other]

@dataclass
class Recommendation:
    id: str
    title: str
    description: str
    reason: str
    action: str
    severity: SeverityLevel
    confidence: int
    category: str = "System"

    def to_dict(self) -> Dict[str, Any]:
        return {
            "id": self.id,
            "title": self.title,
            "description": self.description,
            "reason": self.reason,
            "action": self.action,
            "severity": self.severity.value,
            "confidence": self.confidence,
            "category": self.category,
        }

@dataclass
class TelemetryFrame:
    """Standardized representation of current system telemetry for analyzers."""
    cpu_pct: float
    cpu_temp: float
    cpu_power_w: float
    gpu_pct: float
    gpu_temp: float
    gpu_power_w: float
    vram_used_mb: float
    vram_total_mb: float
    ram_pct: float
    fps: float
    one_percent_low: float

    @classmethod
    def from_raw_telemetry(cls, raw: Dict[str, Any]) -> "TelemetryFrame":
        gpu_metrics = raw.get("gpu_metrics", {})
        return cls(
            cpu_pct=float(raw.get("cpu_pct", 0)),
            cpu_temp=float(raw.get("cpu_temp", 0)),
            cpu_power_w=float(raw.get("cpu_power_w", 0)),
            gpu_pct=float(gpu_metrics.get("utilization", gpu_metrics.get("gpu_util", 0))),
            gpu_temp=float(gpu_metrics.get("temp", gpu_metrics.get("temperature", 0))),
            gpu_power_w=float(gpu_metrics.get("power_draw", gpu_metrics.get("power_draw_w", 0))),
            vram_used_mb=float(gpu_metrics.get("vram_used", gpu_metrics.get("vram_used_mb", 0))),
            vram_total_mb=float(gpu_metrics.get("vram_total", gpu_metrics.get("vram_total_mb", 1))),
            ram_pct=float(raw.get("mem_pct", 0)),
            fps=float(raw.get("fps", 0)),
            one_percent_low=float(raw.get("one_percent_low", 0)),
        )
