from typing import List
from ..schema import Recommendation, SeverityLevel, TelemetryFrame
from .base import BaseAnalyzer

class FpsAnalyzer(BaseAnalyzer):
    def analyze(self, frame: TelemetryFrame) -> List[Recommendation]:
        recs = []

        if frame.fps > 0 and frame.one_percent_low > 0:
            low_ratio = frame.one_percent_low / frame.fps
            if low_ratio < 0.5:
                recs.append(Recommendation(
                    id="fps_instability",
                    title="FPS Instability Detected",
                    description="Large fluctuations in frame rate detected.",
                    reason=f"Your 1% low FPS ({frame.one_percent_low:.0f}) is less than half your average FPS ({frame.fps:.0f}).",
                    action="This can be caused by CPU bottlenecks, high VRAM usage, or background activity.",
                    severity=SeverityLevel.WARNING,
                    confidence=85,
                    category="GPU",
                ))
        return recs
