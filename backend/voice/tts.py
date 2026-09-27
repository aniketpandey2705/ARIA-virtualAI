import os
import sounddevice as sd
from kokoro_onnx import Kokoro

class TextToSpeech:
    def __init__(self):
        base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
        model_file = os.path.join(base_dir, "models", "kokoro", "kokoro-v0_19.onnx")
        voices_file = os.path.join(base_dir, "models", "kokoro", "voices.bin")
        
        if not os.path.exists(model_file) or not os.path.exists(voices_file):
            print(f"Warning: Kokoro model or voices not found at {model_file}")
            self.kokoro = None
        else:
            self.kokoro = Kokoro(model_file, voices_file)
            print("Kokoro TTS Engine initialized. (Ultra-human voice)")

    def speak(self, text):
        if not self.kokoro:
            print("TTS missing model. Cannot speak.")
            return

        # Clean text slightly if needed
        text = text.replace('*', '')

        # af_bella and af_sky are incredibly natural female voices.
        # am_adam is a great male voice.
        samples, sample_rate = self.kokoro.create(
            text, 
            voice="af_bella", 
            speed=1.0, 
            lang="en-us"
        )
        
        # Play audio
        sd.play(samples, sample_rate)
        sd.wait()

