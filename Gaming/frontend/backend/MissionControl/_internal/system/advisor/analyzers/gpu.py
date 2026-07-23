from typing import List
from ..schema import Recommendation, SeverityLevel, TelemetryFrame
from .base import BaseAnalyzer

class GpuAnalyzer(BaseAnalyzer):
    def analyze(self, frame: TelemetryFrame) -> List[Recommendation]:
        recs = []

        # GPU Bottleneck
        if frame.gpu_pct > 95 and frame.cpu_pct < 70:
            recs.append(Recommendation(
                id="gpu_bottleneck",
                title="GPU Bottleneck Detected",
                description="Your GPU is fully utilized.",
                reason=f"GPU usage is {frame.gpu_pct:.0f}% while CPU usage is low ({frame.cpu_pct:.0f}%).",
                action="Lower graphics quality or enable DLSS/FSR/XeSS if available.",
                severity=SeverityLevel.INFORMATIONAL,
                confidence=92,
                category="GPU",
            ))

        # High GPU Temperature
        if frame.gpu_temp >= 100:
            recs.append(Recommendation(
                id="gpu_temp_critical",
                title="Critical GPU Temperature",
                description="Your GPU is exceeding thermal limits.",
                reason=f"Current GPU temperature is {frame.gpu_temp:.1f}°C.",
                action="Check cooling performance immediately.",
                severity=SeverityLevel.CRITICAL,
                confidence=95,
                category="GPU",
            ))
        elif frame.gpu_temp >= 90:
            recs.append(Recommendation(
                id="gpu_temp_warning",
                title="High GPU Temperature",
                description="Your GPU is approaching thermal limits.",
                reason=f"Current GPU temperature is {frame.gpu_temp:.1f}°C.",
                action="Increase fan speeds or improve case airflow.",
                severity=SeverityLevel.WARNING,
                confidence=88,
                category="GPU",
            ))

        # VRAM Nearly Full
        if frame.vram_total_mb > 0:
            vram_pct = (frame.vram_used_mb / frame.vram_total_mb) * 100
            if vram_pct > 90:
                recs.append(Recommendation(
                    id="vram_full",
                    title="VRAM Nearly Full",
                    description="Your Graphics Memory is almost maxed out.",
                    reason=f"VRAM usage is at {vram_pct:.0f}% ({frame.vram_used_mb:.0f} MB used).",
                    action="Lower texture quality, reduce texture packs, or lower rendering resolution.",
                    severity=SeverityLevel.WARNING,
                    confidence=90,
                    category="GPU",
                ))

        return recs
