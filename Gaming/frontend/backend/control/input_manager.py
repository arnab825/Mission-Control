"""
Unified input manager that abstracts keyboard+mouse and gamepad controllers.
Auto-detects connected input devices and provides a common interface.
Supports: Keyboard+Mouse (pynput/pyautogui), Xbox/PlayStation controllers (XInput/SDL).
"""
import time
import threading
import logging
from enum import Enum, auto

logger = logging.getLogger(__name__)

try:
    import pygame
    _PYGAME_AVAILABLE = True
except ImportError:
    _PYGAME_AVAILABLE = False

try:
    from pynput.keyboard import Controller as KeyboardController, Key, Listener as KeyboardListener
    from pynput.mouse import Controller as MouseController, Button, Listener as MouseListener
    _PYNPUT_AVAILABLE = True
except ImportError:
    _PYNPUT_AVAILABLE = False

try:
    from ctypes import windll, Structure, c_ushort, c_short, c_byte, byref
    _XINPUT_AVAILABLE = True
except ImportError:
    _XINPUT_AVAILABLE = False


class InputDevice(Enum):
    """Supported input device types."""
    KEYBOARD_MOUSE = auto()
    XBOX_CONTROLLER = auto()
    PLAYSTATION_CONTROLLER = auto()
    GENERIC_GAMEPAD = auto()
    UNKNOWN = auto()


class GameAction(Enum):
    """Abstract game actions — mapped to device-specific inputs."""
    MOVE_UP = "move_up"
    MOVE_DOWN = "move_down"
    MOVE_LEFT = "move_left"
    MOVE_RIGHT = "move_right"
    AIM_X = "aim_x"                # Mouse X / Right stick X
    AIM_Y = "aim_y"                # Mouse Y / Right stick Y
    PRIMARY_ATTACK = "primary"     # Left click / RT
    SECONDARY_ATTACK = "secondary" # Right click / LT
    INTERACT = "interact"          # E / A (Xbox) / X (PS)
    RELOAD = "reload"              # R / X (Xbox) / Square (PS)
    JUMP = "jump"                  # Space / A (Xbox) / X (PS)
    CROUCH = "crouch"              # Ctrl / B (Xbox) / Circle (PS)
    SPRINT = "sprint"              # Shift / L3
    INVENTORY = "inventory"        # Tab / Back / Touchpad
    MAP = "map"                    # M / View
    PAUSE = "pause"                # Esc / Start


# ── Default Keybind Profiles ────────────────────────────────────

KEYBOARD_MOUSE_DEFAULTS = {
    GameAction.MOVE_UP: "w",
    GameAction.MOVE_DOWN: "s",
    GameAction.MOVE_LEFT: "a",
    GameAction.MOVE_RIGHT: "d",
    GameAction.PRIMARY_ATTACK: "mouse_left",
    GameAction.SECONDARY_ATTACK: "mouse_right",
    GameAction.INTERACT: "e",
    GameAction.RELOAD: "r",
    GameAction.JUMP: "space",
    GameAction.CROUCH: "ctrl",
    GameAction.SPRINT: "shift",
    GameAction.INVENTORY: "tab",
    GameAction.MAP: "m",
    GameAction.PAUSE: "escape",
}

XBOX_DEFAULTS = {
    GameAction.MOVE_UP: "left_stick_up",
    GameAction.MOVE_DOWN: "left_stick_down",
    GameAction.MOVE_LEFT: "left_stick_left",
    GameAction.MOVE_RIGHT: "left_stick_right",
    GameAction.AIM_X: "right_stick_x",
    GameAction.AIM_Y: "right_stick_y",
    GameAction.PRIMARY_ATTACK: "right_trigger",
    GameAction.SECONDARY_ATTACK: "left_trigger",
    GameAction.INTERACT: "button_a",
    GameAction.RELOAD: "button_x",
    GameAction.JUMP: "button_a",
    GameAction.CROUCH: "button_b",
    GameAction.SPRINT: "left_stick_press",
    GameAction.INVENTORY: "button_back",
    GameAction.MAP: "button_view",
    GameAction.PAUSE: "button_start",
}

PLAYSTATION_DEFAULTS = {
    GameAction.MOVE_UP: "left_stick_up",
    GameAction.MOVE_DOWN: "left_stick_down",
    GameAction.MOVE_LEFT: "left_stick_left",
    GameAction.MOVE_RIGHT: "left_stick_right",
    GameAction.AIM_X: "right_stick_x",
    GameAction.AIM_Y: "right_stick_y",
    GameAction.PRIMARY_ATTACK: "r2",
    GameAction.SECONDARY_ATTACK: "l2",
    GameAction.INTERACT: "button_cross",
    GameAction.RELOAD: "button_square",
    GameAction.JUMP: "button_cross",
    GameAction.CROUCH: "button_circle",
    GameAction.SPRINT: "l3",
    GameAction.INVENTORY: "touchpad",
    GameAction.MAP: "touchpad",
    GameAction.PAUSE: "button_options",
}


class InputManager:
    """
    Unified input device manager.
    
    Auto-detects connected devices and provides a common interface for:
    - Querying current input state (what buttons are pressed)
    - Detecting the active input device
    - Mapping abstract game actions to device-specific controls
    - Providing context-aware advice based on input device
    """

    def __init__(self, config=None):
        self.config = config or {}
        self._preferred_device = self.config.get("preferred_device", "auto")
        self._active_device = InputDevice.KEYBOARD_MOUSE
        self._controllers = []
        self._bindings = dict(KEYBOARD_MOUSE_DEFAULTS)
        self._controller_state = {}
        self._lock = threading.Lock()
        self._running = False
        self._poll_thread = None

        # Detect connected devices
        self._detect_devices()
        self._apply_bindings()

        # Input Output Controllers (for agent execution)
        self._keyboard = KeyboardController() if _PYNPUT_AVAILABLE else None
        self._mouse = MouseController() if _PYNPUT_AVAILABLE else None

        # Manual Input Detection (Phase 20)
        self._last_manual_input = 0
        self._kb_listener = None
        self._ms_listener = None
        if _PYNPUT_AVAILABLE:
            self._start_listeners()



    def _detect_devices(self):
        """Detect all connected input devices."""
        self._controllers = []
        
        # Always have keyboard+mouse
        logger.info("Input: Keyboard + Mouse detected (always available)")

        # Try to detect game controllers
        if _PYGAME_AVAILABLE:
            self._detect_pygame_controllers()
        elif _XINPUT_AVAILABLE:
            self._detect_xinput_controllers()
        
        # Set active device based on preference
        if self._preferred_device == "auto":
            # Default to keyboard+mouse, switch dynamically when controller input detected
            self._active_device = InputDevice.KEYBOARD_MOUSE
        elif self._preferred_device == "controller" and self._controllers:
            self._active_device = self._controllers[0]["type"]
        else:
            self._active_device = InputDevice.KEYBOARD_MOUSE

    def _detect_pygame_controllers(self):
        """Detect controllers via pygame."""
        try:
            # ONLY initialize joystick component to avoid SegFaults on headless/threaded systems
            if not pygame.get_init():
                try:
                    pygame.display.init() # Often required for joystick events to work
                except Exception:
                    pass
            pygame.joystick.init()
            count = pygame.joystick.get_count()
            for i in range(count):
                joy = pygame.joystick.Joystick(i)
                joy.init()
                name = joy.get_name().lower()
                
                # Classify controller type
                if "xbox" in name or "xinput" in name or "microsoft" in name:
                    ctype = InputDevice.XBOX_CONTROLLER
                elif "playstation" in name or "dualshock" in name or "dualsense" in name or "ps" in name:
                    ctype = InputDevice.PLAYSTATION_CONTROLLER
                else:
                    ctype = InputDevice.GENERIC_GAMEPAD
                
                self._controllers.append({
                    "index": i,
                    "name": joy.get_name(),
                    "type": ctype,
                    "backend": "pygame",
                    "object": joy,
                    "axes": joy.get_numaxes(),
                    "buttons": joy.get_numbuttons(),
                    "hats": joy.get_numhats(),
                })
                logger.info(f"Input: Controller detected — {joy.get_name()} [{ctype.name}] "
                           f"({joy.get_numaxes()} axes, {joy.get_numbuttons()} buttons)")
        except Exception as e:
            logger.warning(f"pygame controller detection failed: {e}")



    def _detect_xinput_controllers(self):
        """Detect Xbox controllers via Windows XInput API."""
        try:
            xinput = windll.xinput1_4
        except OSError:
            try:
                xinput = windll.xinput1_3
            except OSError:
                return
        
        class XINPUT_STATE(Structure):
            _fields_ = [
                ("packet_number", c_ushort),
                ("gamepad_buttons", c_ushort),
                ("left_trigger", c_byte),
                ("right_trigger", c_byte),
                ("thumb_lx", c_short),
                ("thumb_ly", c_short),
                ("thumb_rx", c_short),
                ("thumb_ry", c_short),
            ]
        
        for i in range(4):  # XInput supports up to 4 controllers
            state = XINPUT_STATE()
            result = xinput.XInputGetState(i, byref(state))
            if result == 0:  # ERROR_SUCCESS
                self._controllers.append({
                    "index": i,
                    "name": f"XInput Controller {i}",
                    "type": InputDevice.XBOX_CONTROLLER,
                    "backend": "xinput",
                    "object": None,
                })
                logger.info(f"Input: XInput Controller {i} detected [XBOX]")

    def _apply_bindings(self):
        """Apply key bindings based on active device."""
        if self._active_device == InputDevice.XBOX_CONTROLLER:
            self._bindings = dict(XBOX_DEFAULTS)
        elif self._active_device == InputDevice.PLAYSTATION_CONTROLLER:
            self._bindings = dict(PLAYSTATION_DEFAULTS)
        else:
            self._bindings = dict(KEYBOARD_MOUSE_DEFAULTS)
        
        # Apply custom overrides from config
        custom = self.config.get("custom_bindings", {})
        for action_name, key in custom.items():
            try:
                action = GameAction(action_name)
                self._bindings[action] = key
            except ValueError:
                logger.warning(f"Unknown game action in bindings: {action_name}")

    # ── Public API ────────────────────────────────────────────────

    @property
    def active_device(self) -> InputDevice:
        """Get the currently active input device type."""
        with self._lock:
            return self._active_device

    @property
    def active_device_name(self) -> str:
        """Get a human-friendly name for the active device."""
        device = self.active_device
        names = {
            InputDevice.KEYBOARD_MOUSE: "Keyboard + Mouse",
            InputDevice.XBOX_CONTROLLER: "Xbox Controller",
            InputDevice.PLAYSTATION_CONTROLLER: "PlayStation Controller",
            InputDevice.GENERIC_GAMEPAD: "Gamepad",
        }
        return names.get(device, "Unknown")

    @property
    def connected_controllers(self) -> list:
        """List all detected controllers."""
        return [{"name": c["name"], "type": c["type"].name} for c in self._controllers]

    def get_binding(self, action: GameAction) -> str:
        """Get the current key/button bound to an action."""
        return self._bindings.get(action, "unbound")

    def get_binding_display(self, action: GameAction) -> str:
        """Get a display-friendly label for a binding (for overlay/advice)."""
        raw = self.get_binding(action)
        display_names = {
            "mouse_left": "Left Click",
            "mouse_right": "Right Click",
            "space": "Space",
            "ctrl": "Ctrl",
            "shift": "Shift",
            "tab": "Tab",
            "escape": "Esc",
            "button_a": "A",
            "button_b": "B",
            "button_x": "X",
            "button_y": "Y",
            "right_trigger": "RT",
            "left_trigger": "LT",
            "left_stick_press": "L3",
            "button_start": "Start",
            "button_back": "Select",
            "button_cross": "✕",
            "button_circle": "○",
            "button_square": "□",
            "button_triangle": "△",
            "r2": "R2",
            "l2": "L2",
            "l3": "L3",
            "button_options": "Options",
            "touchpad": "Touchpad",
        }
        return display_names.get(raw, raw.upper() if len(raw) == 1 else raw.replace("_", " ").title())

    def get_action_hint(self, action: GameAction) -> str:
        """Get a contextual hint like 'Press E' or 'Press A'."""
        display = self.get_binding_display(action)
        return f"Press {display}"

    def switch_device(self, device_type: InputDevice):
        """Manually switch the active input device."""
        with self._lock:
            self._active_device = device_type
        self._apply_bindings()
        logger.info(f"Input device switched to: {device_type.name}")

    def execute_action(self, action: GameAction, mode="press"):
        """Execute a game action via keyboard/mouse (Agent Co-pilot)."""
        if not _PYNPUT_AVAILABLE:
            logger.warning("pynput not available - cannot execute action")
            return

        key = self.get_binding(action)
        if not key or key == "unbound":
            return

        self.execute_key(key, mode)

    def execute_key(self, key_str, mode="press"):
        """Execute a raw key string."""
        if not self._keyboard or not self._mouse:
            return

        # Special handling for mouse
        if key_str == "mouse_left":
            if mode == "press": self._mouse.press(Button.left)
            elif mode == "release": self._mouse.release(Button.left)
            else: self._mouse.click(Button.left)
            return
        elif key_str == "mouse_right":
            if mode == "press": self._mouse.press(Button.right)
            elif mode == "release": self._mouse.release(Button.right)
            else: self._mouse.click(Button.right)
            return

        # Keyboard
        try:
            # Check for special keys (space, ctrl, etc)
            special_map = {
                "space": Key.space,
                "ctrl": Key.ctrl,
                "shift": Key.shift,
                "alt": Key.alt,
                "enter": Key.enter,
                "escape": Key.esc,
                "tab": Key.tab,
            }
            key = special_map.get(key_str.lower(), key_str)
            
            if mode == "press": self._keyboard.press(key)
            elif mode == "release": self._keyboard.release(key)
            else:
                self._keyboard.press(key)
                time.sleep(0.05)
                self._keyboard.release(key)
        except Exception as e:
            logger.error(f"Failed to execute key {key_str}: {e}")

    # ── Manual Override Detection (Phase 20) ──────────────────────────
    
    def _start_listeners(self):
        """Start listeners to detect manual user input."""
        def on_input(*args, **kwargs):
            self._last_manual_input = time.time()
        
        self._kb_listener = KeyboardListener(on_press=on_input)
        # Avoid tracking on_move because a low-level global mouse move hook intercepts hundreds of events
        # per second and blocks the Win32 input thread, causing lag and freezes in games.
        # on_click and on_scroll are sufficient to detect user manual activity.
        self._ms_listener = MouseListener(on_click=on_input, on_scroll=on_input)
        
        self._kb_listener.start()
        self._ms_listener.start()
        logger.info("Manual input listeners started (User-Override active without move overhead)")

    def is_user_active(self, threshold=2.0) -> bool:
        """Returns True if the user has performed manual input within the threshold."""
        return (time.time() - self._last_manual_input) < threshold



    def get_device_info(self) -> dict:
        """Get full info about current input state (for overlay/debugging)."""
        return {
            "active_device": self.active_device_name,
            "active_type": self.active_device.name,
            "controllers_connected": len(self._controllers),
            "controllers": self.connected_controllers,
            "controller_state": dict(self._controller_state),
        }

    def start_polling(self):
        """Start background polling for controller state (for auto-switch)."""
        if not self._controllers or self._running:
            return
        
        self._running = True
        self._poll_thread = threading.Thread(
            target=self._poll_loop, name="InputPoll", daemon=True
        )
        self._poll_thread.start()
        logger.info("Controller polling started")

    def stop_polling(self):
        """Stop background polling."""
        self._running = False
        if self._poll_thread:
            self._poll_thread.join(timeout=1.0)

    def _poll_loop(self):
        """Background thread that polls controller state."""
        while self._running:
            try:
                self._poll_controllers()
            except Exception as e:
                logger.debug(f"Controller poll error: {e}")
            time.sleep(0.016)  # ~60hz polling

    def _poll_controllers(self):
        """Poll all connected controllers for current state."""
        if not self._controllers:
            return
        
        controller = self._controllers[0]
        
        if controller["backend"] == "pygame" and _PYGAME_AVAILABLE:
            self._poll_pygame(controller)

    def _poll_pygame(self, controller):
        """Poll controller via pygame."""
        try:
            pygame.event.pump()
            joy = controller["object"]
            
            state = {
                "left_stick_x": joy.get_axis(0) if joy.get_numaxes() > 0 else 0,
                "left_stick_y": joy.get_axis(1) if joy.get_numaxes() > 1 else 0,
                "right_stick_x": joy.get_axis(2) if joy.get_numaxes() > 2 else 0,
                "right_stick_y": joy.get_axis(3) if joy.get_numaxes() > 3 else 0,
                "left_trigger": joy.get_axis(4) if joy.get_numaxes() > 4 else 0,
                "right_trigger": joy.get_axis(5) if joy.get_numaxes() > 5 else 0,
            }
            
            # Read buttons
            for b in range(min(joy.get_numbuttons(), 16)):
                state[f"button_{b}"] = joy.get_button(b)
            
            with self._lock:
                self._controller_state = state
            
            # Auto-switch: if any significant controller input, switch to controller
            any_input = (
                abs(state.get("left_stick_x", 0)) > 0.3 or
                abs(state.get("left_stick_y", 0)) > 0.3 or
                any(state.get(f"button_{i}", 0) for i in range(min(joy.get_numbuttons(), 16)))
            )
            if any_input and self._active_device == InputDevice.KEYBOARD_MOUSE:
                self.switch_device(controller["type"])
        except Exception as e:
            logger.debug(f"pygame poll error: {e}")




if __name__ == "__main__":
    mgr = InputManager()
    print(f"Active device: {mgr.active_device_name}")
    print(f"Controllers: {mgr.connected_controllers}")
    print(f"\nDefault bindings ({mgr.active_device.name}):")
    for action in GameAction:
        print(f"  {action.value:20s} → {mgr.get_binding_display(action)}")
