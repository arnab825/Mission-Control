import cv2
import numpy as np

class SimpleDetector:
    def __init__(self, config=None):
        """
        config: dict containing parameters for detection
        """
        # Default config if none provided
        self.config = config or {
            "health_bar": {
                "roi": [0.05, 0.9, 0.2, 0.95],  # [x_start, y_start, x_end, y_end] as fractions
                "color_low": [0, 100, 100],     # HSV for red-ish health
                "color_high": [10, 255, 255],
                "threshold_percent": 30.0
            },
            "enemy": {
                "color_low": [110, 100, 100],    # HSV for blue-ish (example)
                "color_high": [130, 255, 255],
                "min_area": 500
            }
        }

    def detect_health(self, frame):
        """
        Analyzes health bar and returns percentage.
        """
        h, w = frame.shape[:2]
        r = self.config["health_bar"]["roi"]
        roi_img = frame[int(r[1]*h):int(r[3]*h), int(r[0]*w):int(r[2]*w)]
        
        hsv = cv2.cvtColor(roi_img, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, np.array(self.config["health_bar"]["color_low"]), 
                           np.array(self.config["health_bar"]["color_high"]))
        
        # Calculate percentage of pixels matching color
        health_pixels = cv2.countNonZero(mask)
        total_pixels = roi_img.shape[0] * roi_img.shape[1]
        percent = (health_pixels / total_pixels) * 100 if total_pixels > 0 else 0
        
        is_low = percent < self.config["health_bar"]["threshold_percent"]
        return percent, is_low

    def detect_enemies(self, frame):
        """
        Detects enemies based on color and returns bounding boxes.
        """
        hsv = cv2.cvtColor(frame, cv2.COLOR_BGR2HSV)
        mask = cv2.inRange(hsv, np.array(self.config["enemy"]["color_low"]), 
                           np.array(self.config["enemy"]["color_high"]))
        
        contours, _ = cv2.findContours(mask, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_SIMPLE)
        enemies = []
        for cnt in contours:
            area = cv2.contourArea(cnt)
            if area > self.config["enemy"]["min_area"]:
                x, y, w, h = cv2.boundingRect(cnt)
                enemies.append((x, y, w, h))
        
        return enemies

if __name__ == "__main__":
    # Test with dummy frame
    frame = np.zeros((720, 1280, 3), dtype=np.uint8)
    detector = SimpleDetector()
    health, low = detector.detect_health(frame)
    enemies = detector.detect_enemies(frame)
    print(f"Health: {health}%, Low: {low}, Enemies: {len(enemies)}")
