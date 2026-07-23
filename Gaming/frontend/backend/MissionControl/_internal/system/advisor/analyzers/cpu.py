from typing import List
from ..schema import Recommendation, SeverityLevel, TelemetryFrame
from .base import BaseAnalyzer

class CpuAnalyzer(BaseAnalyzer):
    def analyze(self, frame: TelemetryFrame) -> List[Recommendation]:
        recs = []

        # High CPU Temp
        if frame.cpu_temp >= 100:
            recs.append(Recommendation(
                id="cpu_temp_critical",
                title="Critical CPU Temperature",
                description="Your processor is exceeding thermal limits.",
                reason=f"Current CPU temperature is {frame.cpu_temp:.1f}°C.",
                action="Check cooling performance immediately to prevent hardware damage.",
                severity=SeverityLevel.CRITICAL,
                confidence=95,
                category="CPU",
            ))
        elif frame.cpu_temp >= 90:
            recs.append(Recommendation(
                id="cpu_temp_warning",
                title="High CPU Temperature",
                description="Your processor is approaching thermal limits.",
                reason=f"Current CPU temperature is {frame.cpu_temp:.1f}°C.",
                action="Increase cooling, improve airflow, or reduce CPU-intensive workloads.",
                severity=SeverityLevel.WARNING,
                confidence=90,
                category="CPU",
            ))

        # CPU Bottleneck
        # Conditions: CPU usage consistently > 90%, GPU < 75%
        if frame.cpu_pct > 90 and frame.gpu_pct < 75:
            recs.append(Recommendation(
                id="cpu_bottleneck",
                title="CPU Bottleneck Detected",
                description="Your CPU is limiting game performance.",
                reason=f"CPU usage is very high ({frame.cpu_pct:.0f}%) while GPU usage is low ({frame.gpu_pct:.0f}%).",
                action="Lower CPU-intensive settings such as view distance, crowd density, or physics.",
                severity=SeverityLevel.RECOMMENDATION,
                confidence=85,
                category="CPU",
            ))

        return recs
