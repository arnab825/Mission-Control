"""
Mission Control — Bridge Logging Handler
Streams Python logging output live to the frontend over WebSocket bridge.
"""
import logging
import time


class BridgeLogHandler(logging.Handler):
    """Custom logging handler to route logs over the WebSocket bridge."""

    def __init__(self, bridge_server):
        super().__init__()
        self.bridge = bridge_server
        self.setFormatter(logging.Formatter("%(message)s", "%H:%M:%S"))

    def emit(self, record):
        name = record.name
        # Bypass websockets/asyncio/bridge_server records to avoid infinite feedback loops
        if name.startswith("websockets") or name.startswith("bridge_server") or name.startswith("asyncio"):
            return
        try:
            log_type = record.levelname
            # Highlight AI reasoning/coaching outputs in teal as AGENT log entries
            if name.startswith("ai_brain") or name.startswith("pipeline_host"):
                if log_type == "INFO":
                    log_type = "AGENT"

            log_entry = {
                "time": self.formatter.formatTime(record, "%H:%M:%S") if self.formatter else time.strftime("%H:%M:%S", time.localtime(record.created)),
                "type": log_type,
                "msg": record.getMessage()
            }
            self.bridge.add_log(log_entry)
        except Exception:
            self.handleError(record)
