from faster_whisper import WhisperModel

class SpeechToText:
    def __init__(self, model_size="small.en"):
        # For initial testing, tiny.en is very fast and uses little VRAM.
        # We force CPU for now to avoid CUDA DLL missing errors.
        # small.en runs fast on a modern CPU and is exceptionally accurate.
        self.model = WhisperModel(model_size, device="cpu", compute_type="int8")
        print(f"WhisperModel {model_size} loaded.")

    def transcribe(self, audio_file_path):
        # beam_size=5 massively improves accuracy over greedy decoding (beam_size=1)
        segments, info = self.model.transcribe(audio_file_path, beam_size=5)
        text = " ".join([segment.text for segment in segments])
        return text.strip()
