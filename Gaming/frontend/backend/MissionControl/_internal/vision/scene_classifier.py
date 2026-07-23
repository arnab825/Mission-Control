"""
Scene classifier for detecting the current game context.
Classifies frames into: combat, dialogue, exploration, cutscene, menu, inventory, loading.
"""
import cv2
import numpy as np
import logging
from collections import deque, Counter

logger = logging.getLogger(__name__)

SCENE_TYPES = ["combat", "dialogue", "exploration", "cutscene", "menu", "inventory", "loading", "unknown"]

class SceneClassifier:
    def __init__(self, config=None):
        self.config = config or {}
        self._history = deque(maxlen=self.config.get("history_size", 15))
        self._current_scene = "unknown"
        self._letterbox_thresh = self.config.get("letterbox_threshold", 0.08)
        self._motion_thresh = self.config.get("motion_threshold", 30.0)
        self._dark_thresh = self.config.get("dark_frame_threshold", 15)
        self._prev_gray = None

    def classify(self, frame, detections=None, ocr_results=None):
        features = self._extract_features(frame)
        scores = {
            "loading": self._score_loading(features),
            "cutscene": self._score_cutscene(features),
            "menu": self._score_menu(features, ocr_results),
            "dialogue": self._score_dialogue(features, ocr_results),
            "inventory": self._score_inventory(features, ocr_results),
            "combat": self._score_combat(features, detections),
            "exploration": self._score_exploration(features, detections),
        }
        best_scene = max(scores, key=scores.get)
        best_score = scores[best_scene]
        if best_score < 0.2:
            best_scene = "unknown"
        self._history.append(best_scene)
        smoothed = self._smooth_scene()
        self._current_scene = smoothed
        return {"scene": smoothed, "raw_scene": best_scene, "confidence": best_score, "scores": scores}

    @property
    def current_scene(self):
        return self._current_scene

    def _extract_features(self, frame):
        h, w = frame.shape[:2]
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        f = {}
        f["brightness"] = float(np.mean(gray))
        f["color_variance"] = float(np.std(hsv[:, :, 0]))
        f["saturation_mean"] = float(np.mean(hsv[:, :, 1]))
        top = gray[:int(h * self._letterbox_thresh), :]
        bot = gray[int(h * (1 - self._letterbox_thresh)):, :]
        f["has_letterbox"] = np.mean(top) < self._dark_thresh and np.mean(bot) < self._dark_thresh
        edges = cv2.Canny(gray, 50, 150)
        f["edge_density"] = float(np.count_nonzero(edges) / (h * w))
        if self._prev_gray is not None and self._prev_gray.shape == gray.shape and self._prev_gray.dtype == gray.dtype:
            try:
                f["motion"] = float(np.mean(cv2.absdiff(gray, self._prev_gray)))
            except Exception as e:
                logger.error(f"Error in absdiff: {e}")
                f["motion"] = 0.0
        else:
            f["motion"] = 0.0
        self._prev_gray = gray.copy()
        f["is_dark"] = f["brightness"] < self._dark_thresh
        hk = cv2.getStructuringElement(cv2.MORPH_RECT, (40, 1))
        vk = cv2.getStructuringElement(cv2.MORPH_RECT, (1, 40))
        hl = cv2.morphologyEx(edges, cv2.MORPH_OPEN, hk)
        vl = cv2.morphologyEx(edges, cv2.MORPH_OPEN, vk)
        f["ui_line_density"] = float((np.count_nonzero(hl) + np.count_nonzero(vl)) / (h * w))
        cr = gray[int(h*0.6):int(h*0.9), int(w*0.15):int(w*0.85)]
        f["center_bottom_brightness"] = float(np.mean(cr))
        f["center_bottom_variance"] = float(np.std(cr))
        return f

    def _score_loading(self, f):
        s = 0.0
        if f["is_dark"]: s += 0.5
        if f["motion"] < 3.0: s += 0.3
        if f["color_variance"] < 10: s += 0.2
        return min(s, 1.0)

    def _score_cutscene(self, f):
        s = 0.0
        if f["has_letterbox"]: s += 0.6
        if f["motion"] > 5.0 and not f["is_dark"]: s += 0.2
        if f["edge_density"] < 0.05: s += 0.1
        if 30 < f["brightness"] < 180: s += 0.1
        return min(s, 1.0)

    def _score_menu(self, f, ocr=None):
        s = 0.0
        if f["ui_line_density"] > 0.01: s += 0.3
        if f["motion"] < 5.0: s += 0.2
        if f["edge_density"] > 0.08: s += 0.2
        if ocr:
            kws = ["settings","options","resume","quit","exit","load","save","new game","continue"]
            for texts in ocr.values():
                for t in texts:
                    if any(k in t.get("text","").lower() for k in kws):
                        s += 0.3; break
        return min(s, 1.0)

    def _score_dialogue(self, f, ocr=None):
        s = 0.0
        if f["center_bottom_variance"] < 30 and f["center_bottom_brightness"] > 50: s += 0.3
        if f["motion"] < 10.0: s += 0.1
        if ocr:
            for r in ["subtitle","dialogue"]:
                texts = ocr.get(r, [])
                words = sum(len(t.get("text","").split()) for t in texts)
                if words > 3: s += 0.5
                elif words > 0: s += 0.2
        return min(s, 1.0)

    def _score_inventory(self, f, ocr=None):
        s = 0.0
        if f["ui_line_density"] > 0.015: s += 0.3
        if f["motion"] < 3.0: s += 0.2
        if ocr:
            kws = ["inventory","equipment","items","weapons","armor","stats","crafting"]
            for texts in ocr.values():
                for t in texts:
                    if any(k in t.get("text","").lower() for k in kws):
                        s += 0.4; break
        return min(s, 1.0)

    def _score_combat(self, f, dets=None):
        s = 0.0
        if f["motion"] > self._motion_thresh: s += 0.3
        if f["motion"] > 15.0: s += 0.1
        if dets and len(dets) > 0: s += 0.4
        if dets and len(dets) > 2: s += 0.1
        if f["saturation_mean"] > 60: s += 0.1
        return min(s, 1.0)

    def _score_exploration(self, f, dets=None):
        s = 0.0
        if 5.0 < f["motion"] < self._motion_thresh: s += 0.3
        if f["color_variance"] > 30: s += 0.2
        if 40 < f["brightness"] < 200: s += 0.2
        if dets is None or len(dets) == 0: s += 0.2
        return min(s, 1.0)

    def _smooth_scene(self):
        if not self._history: return "unknown"
        counts = Counter(self._history)
        best, count = counts.most_common(1)[0]
        return best if count >= len(self._history) * 0.4 else self._current_scene
