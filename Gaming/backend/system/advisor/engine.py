from typing import Any, Dict, List
from .schema import Recommendation, TelemetryFrame
from .analyzers.base import BaseAnalyzer
from .analyzers.cpu import CpuAnalyzer
from .analyzers.gpu import GpuAnalyzer
from .analyzers.memory import MemoryAnalyzer
from .analyzers.fps import FpsAnalyzer

class PerformanceAdvisor:
    def __init__(self):
        self.analyzers: List[BaseAnalyzer] = [
            CpuAnalyzer(),
            GpuAnalyzer(),
            MemoryAnalyzer(),
            FpsAnalyzer(),
        ]
        # To avoid spamming, we can maintain state here.
        # For now, we'll return stateless evaluations on each frame,
        # but sort them properly.
    
    def evaluate(self, raw_telemetry: Dict[str, Any]) -> List[Dict[str, Any]]:
        """
        Ingests a raw telemetry dictionary, runs all analyzers,
        and returns a sorted list of recommendations as dictionaries.
        """
        frame = TelemetryFrame.from_raw_telemetry(raw_telemetry)
        
        all_recs: List[Recommendation] = []
        for analyzer in self.analyzers:
            try:
                all_recs.extend(analyzer.analyze(frame))
            except Exception as e:
                # Log analyzer failures without crashing the pipeline
                pass
        
        # Deduplicate by ID just in case
        unique_recs = {}
        for rec in all_recs:
            if rec.id not in unique_recs:
                unique_recs[rec.id] = rec
            else:
                # If duplicate ID, keep the higher severity one
                if rec.severity > unique_recs[rec.id].severity:
                    unique_recs[rec.id] = rec
        
        # Sort by severity (descending) and then confidence (descending)
        sorted_recs = sorted(
            unique_recs.values(),
            key=lambda r: (r.severity, r.confidence),
            reverse=True
        )
        
        return [r.to_dict() for r in sorted_recs]
