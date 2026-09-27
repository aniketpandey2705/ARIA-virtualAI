from vision.screen_capture import ScreenCapture

class VisionContextManager:
    def __init__(self):
        self.capture = ScreenCapture()
        
        self.vision_keywords = [
            "look at",
            "my screen",
            "the screen",
            "what am i looking at",
            "what are you looking at",
            "read this",
            "what does this say",
            "wrong with my code",
            "can you see",
            "explain what i",
            "look again"
        ]

    def needs_screen_analysis(self, user_text):
        text_lower = user_text.lower()
        text_clean = text_lower.replace("'", "").replace(".", "").replace(",", "")
        
        for keyword in self.vision_keywords:
            kw_clean = keyword.replace("'", "")
            if kw_clean in text_clean:
                return True
        return False

    def capture_screen_for_llm(self):
        print("\n[📸 Capturing Screen...]")
        image_path = self.capture.capture_screen()
        return image_path
