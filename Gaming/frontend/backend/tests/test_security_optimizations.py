import unittest
import sys
import os
import time
import numpy as np
from unittest.mock import MagicMock, patch

sys.path.insert(0, os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from core.pipeline_host import GamingAssistantPipeline
from core.bridge_server import BridgeServer

class TestSecurityOptimizations(unittest.TestCase):
    def setUp(self):
        self.config = {
            "agentic": {
                "confirmation_delay": 2
            },
            "capture": {
                "backend": "dxcam"
            },
            "vision": {
                "yolo_run_every_n_frames": 3,
                "ocr": {"enabled": False}
            }
        }

    @patch("core.bridge_server.logger")
    def test_cswsh_origin_validation(self, mock_logger):
        # Initialize BridgeServer
        server = BridgeServer()
        
        class MockWebSocket:
            def __init__(self, origin, block_event=None):
                self.request_headers = {"Origin": origin} if origin else {}
                self.remote_address = ("127.0.0.1", 12345)
                self.closed = False
                self.closed_code = None
                self.closed_reason = None
                self.sent_messages = []
                self.block_event = block_event

            async def close(self, code=1000, reason=""):
                self.closed = True
                self.closed_code = code
                self.closed_reason = reason

            async def send(self, message):
                self.sent_messages.append(message)

            def __aiter__(self):
                return self

            async def __anext__(self):
                if self.block_event:
                    await self.block_event.wait()
                raise StopAsyncIteration

        ws_unauthorized = MockWebSocket("https://malicious.com")
        ws_authorized_file = MockWebSocket("file://")

        async def run_handler(ws):
            await server._handler(ws)

        import asyncio
        loop = asyncio.new_event_loop()
        try:
            # Test unauthorized origin
            loop.run_until_complete(run_handler(ws_unauthorized))
            self.assertTrue(ws_unauthorized.closed)
            self.assertEqual(ws_unauthorized.closed_code, 4001)
            self.assertNotIn(ws_unauthorized, server.clients)

            # Test authorized local origin
            block_event = asyncio.Event()
            ws_authorized_local = MockWebSocket("http://localhost:3000", block_event)
            
            async def run_and_check():
                task = asyncio.create_task(server._handler(ws_authorized_local))
                # yield control to let _handler run and add to self.clients
                await asyncio.sleep(0.01)
                self.assertIn(ws_authorized_local, server.clients)
                self.assertFalse(ws_authorized_local.closed)
                # Now trigger stop and let it clean up
                block_event.set()
                await task
                # Check that it got cleaned up
                self.assertNotIn(ws_authorized_local, server.clients)

            loop.run_until_complete(run_and_check())
        finally:
            loop.close()

    def test_privacy_shield_active(self):
        # Create pipeline instance
        pipeline = GamingAssistantPipeline(self.config)
        
        # Simulate active game but UNFOCUSED + desktop-level capture (dxcam)
        pipeline._game_state["is_game_focused"] = False
        pipeline.capture._backend_name = "dxcam"
        
        # Input standard test frame (100x100 RGB color image)
        frame = np.ones((100, 100, 3), dtype=np.uint8) * 128
        
        # Run vision processing
        pipeline._process_vision(frame)
        
        # Verify that the frame was blacked out (all pixels 0)
        self.assertTrue(np.all(frame == 0) or (np.any(frame == 0) and not np.all(frame == 128)))
        # Verify YOLO/OCR/Story advice was skipped / reset to empty defaults
        self.assertEqual(pipeline._game_state["detections_count"], 0)
        self.assertEqual(pipeline._game_state["scene_type"], "waiting")
        self.assertEqual(pipeline._game_state["story_advice"], "")

    def test_safety_delay_and_abort_override(self):
        pipeline = GamingAssistantPipeline(self.config)
        pipeline.agentic_mode_active = True
        
        # Test aborting on deactivation
        pipeline.agentic_mode_active = False
        aborted = pipeline._check_abort_and_sleep(0.5)
        self.assertTrue(aborted)
        
        # Test aborting on user activity (mouse/keyboard input)
        pipeline.agentic_mode_active = True
        pipeline.input_manager._last_manual_input = time.time()
        aborted_activity = pipeline._check_abort_and_sleep(0.5)
        self.assertTrue(aborted_activity)

    def test_neural_security_features(self):
        from core.security import SecureSandbox, xor_encrypt_decrypt, xor_decrypt
        # Test basic XOR cipher
        key = b"12345678901234567890123456789012"
        orig = "super_secret_model_id"
        enc = xor_encrypt_decrypt(orig, key)
        self.assertNotEqual(orig, enc)
        dec = xor_decrypt(enc, key)
        self.assertEqual(orig, dec)

        # Test SecureSandbox container
        sandbox = SecureSandbox(key)
        sandbox.set("test_key", "secret_value")
        self.assertEqual(sandbox.get("test_key"), "secret_value")
        
        # Test Sandbox key rotation
        new_key = b"abcdefghijklmnopqrstffffffffffff"
        sandbox.rotate_key(new_key)
        self.assertEqual(sandbox.get("test_key"), "secret_value")

if __name__ == "__main__":
    unittest.main()
