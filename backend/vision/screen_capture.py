import mss
from PIL import Image
import os

class ScreenCapture:
    def __init__(self, max_width=1280):
        self.max_width = max_width
        self.temp_path = "temp_screenshot.jpg"

    def capture_screen(self):
        try:
            with mss.mss() as sct:
                # Monitor 1 is typically the primary monitor
                monitor = sct.monitors[1]
                screenshot = sct.grab(monitor)
                
                # Convert to PIL Image
                img = Image.frombytes("RGB", screenshot.size, screenshot.bgra, "raw", "BGRX")
                
                # Preserve up to 1080p resolution so small code remains readable for the AI
                w, h = img.size
                if w > 1920:
                    ratio = 1920 / w
                    new_h = int(h * ratio)
                    img = img.resize((1920, new_h), Image.Resampling.LANCZOS)
                
                # Save temporarily
                img.save(self.temp_path, format="JPEG", quality=85)
                return self.temp_path
        except Exception as e:
            print(f"Screen capture failed: {e}")
            return None

    def cleanup(self):
        if os.path.exists(self.temp_path):
            try:
                os.remove(self.temp_path)
            except:
                pass
