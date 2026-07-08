from typing import List
from ..schema import Recommendation, TelemetryFrame

class BaseAnalyzer:
    """Base class for all telemetry analyzers."""
    
    def analyze(self, frame: TelemetryFrame) -> List[Recommendation]:
        """
        Analyzes the given telemetry frame and returns a list of recommendations.
        Must be implemented by subclasses.
        """
        raise NotImplementedError("Subclasses must implement analyze()")
