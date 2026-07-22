# c:\GitHub\AI-Models\AI-Gaming-Assistant\control\handler.py
"""
Game control handler — executes actions via keyboard+mouse or controller.
Uses the InputManager for device-aware input routing.
"""
import pyautogui
import pynput
import time
import logging

from control.input_manager import InputManager, InputDevice, GameAction

logger = logging.getLogger(__name__)


class GameController:
    """
    Executes game actions through the appropriate input device.
    Supports keyboard+mouse and game controllers.
    """

    def __init__(self, config=None):
        self.config = config or {}
        
        # Safety: move mouse to top-left corner to abort
        pyautogui.FAILSAFE = True
        pyautogui.PAUSE = 0.01  # Reduce default pause for faster inputs
        
        # Keyboard + Mouse backends
        self.mouse = pynput.mouse.Controller()
        self.keyboard = pynput.keyboard.Controller()
        
        # Input manager for device detection and binding resolution
        self.input_manager = InputManager(config=self.config.get("input", {}))
        
        # Controller vibration/haptics support
        self._vibration_supported = False
        
        logger.info(f"GameController initialized — Device: {self.input_manager.active_device_name}")

    # ── Abstract Action Execution ─────────────────────────────────

    def execute_action(self, action: GameAction, value=None):
        """
        Execute a game action through the active input device.
        
        :param action: The abstract game action to perform
        :param value: Optional value (e.g., analog stick magnitude 0.0-1.0)
        """
        device = self.input_manager.active_device
        binding = self.input_manager.get_binding(action)
        
        if device == InputDevice.KEYBOARD_MOUSE:
            self._execute_kb_mouse(action, binding, value)
        else:
            self._execute_controller(action, binding, value)

    def _execute_kb_mouse(self, action, binding, value=None):
        """Execute action via keyboard+mouse."""
        if binding == "mouse_left":
            pyautogui.click()
        elif binding == "mouse_right":
            pyautogui.rightClick()
        elif binding in ("mouse_middle",):
            pyautogui.middleClick()
        else:
            # Keyboard key
            self.press_key(binding)

    def _execute_controller(self, action, binding, value=None):
        """
        Execute action via controller.
        Note: Controller output (sending inputs TO a controller) requires
        specialized libraries like vgamepad. This is a placeholder for
        the agent mode where the AI would control the game.
        """
        logger.debug(f"Controller action: {action.value} → {binding} (value={value})")
        # For agent mode: would use vgamepad to simulate controller inputs

    # ── Direct Input Methods ──────────────────────────────────────

    def move_to(self, x, y, duration=0.1):
        """Move mouse to screen coordinates."""
        pyautogui.moveTo(x, y, duration=duration)

    def move_relative(self, dx, dy):
        """Move mouse by relative offset (for aim adjustments)."""
        pyautogui.moveRel(dx, dy, duration=0.02)

    def click(self, button="left"):
        """Click mouse button."""
        pyautogui.click(button=button)

    def press_key(self, key):
        """Press and release a keyboard key."""
        try:
            self.keyboard.press(key)
            time.sleep(0.03)
            self.keyboard.release(key)
        except Exception:
            # Fall back to pyautogui for special keys
            pyautogui.press(key)

    def hold_key(self, key, duration=0.5):
        """Hold a key for a duration (for sprint, charge attacks, etc.)."""
        try:
            self.keyboard.press(key)
            time.sleep(duration)
            self.keyboard.release(key)
        except Exception:
            pyautogui.keyDown(key)
            time.sleep(duration)
            pyautogui.keyUp(key)

    def key_combo(self, *keys):
        """Press a combination of keys simultaneously."""
        pyautogui.hotkey(*keys)

    # ── Context-Aware Hints ───────────────────────────────────────

    def get_action_hint(self, action: GameAction) -> str:
        """
        Get a display hint for an action based on active device.
        E.g., "Press E" (keyboard) or "Press A" (Xbox controller)
        """
        return self.input_manager.get_action_hint(action)

    def get_interact_hint(self) -> str:
        """Shortcut for the interact action hint."""
        return self.get_action_hint(GameAction.INTERACT)

    def get_reload_hint(self) -> str:
        """Shortcut for the reload action hint."""
        return self.get_action_hint(GameAction.RELOAD)

    # ── Device Info ───────────────────────────────────────────────

    @property
    def device_info(self) -> dict:
        """Get current input device information."""
        return self.input_manager.get_device_info()

    def start_controller_polling(self):
        """Start background polling for controller auto-detection."""
        self.input_manager.start_polling()

    def stop_controller_polling(self):
        """Stop background polling."""
        self.input_manager.stop_polling()
