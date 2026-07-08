from typing import List
from ..schema import Recommendation, SeverityLevel, TelemetryFrame
from .base import BaseAnalyzer

class MemoryAnalyzer(BaseAnalyzer):
    def analyze(self, frame: TelemetryFrame) -> List[Recommendation]:
        recs = []

        if frame.ram_pct > 95:
            recs.append(Recommendation(
                id="ram_critical",
                title="Critical RAM Usage",
                description="Your system memory is almost exhausted.",
                reason=f"System RAM usage is {frame.ram_pct:.0f}%.",
                action="Close background applications immediately or upgrade your memory.",
                severity=SeverityLevel.CRITICAL,
                confidence=95,
                category="Memory",
            ))
        elif frame.ram_pct > 85:
            recs.append(Recommendation(
                id="ram_warning",
                title="High RAM Usage",
                description="High memory usage may cause stuttering or swapping.",
                reason=f"System RAM usage is {frame.ram_pct:.0f}%.",
                action="Closing unused background applications could improve performance.",
                severity=SeverityLevel.WARNING,
                confidence=85,
                category="Memory",
            ))

        return recs
