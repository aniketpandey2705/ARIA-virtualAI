import sys
import os

# Add the current directory to sys.path so we can import modules
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

import keyboard
import sounddevice as sd
import numpy as np
import soundfile as sf
import queue
import time

from voice.stt import SpeechToText
from voice.tts import TextToSpeech
from brain.conversation import ConversationManager

def main():
    print("Initializing ARIA...")
    print("Loading Speech-to-Text (faster-whisper)...")
    stt = SpeechToText(model_size="small.en")
    
    print("Loading Text-to-Speech...")
    tts = TextToSpeech()
    
    manager = ConversationManager()
    
    fs = 16000
    q = queue.Queue()
    recording = False
    audio_data = []

    def callback(indata, frames, time_info, status):
        if status:
            print(status, file=sys.stderr)
        if recording:
            q.put(indata.copy())

    print("\n" + "="*50)
    print("ARIA is Ready.")
    print("Press and HOLD the 'SPACE' bar to talk.")
    print("Release 'SPACE' to send your voice.")
    print("Press 'ESC' to exit.")
    print("="*50 + "\n")

    with sd.InputStream(samplerate=fs, channels=1, callback=callback, dtype='int16'):
        while True:
            if keyboard.is_pressed('esc'):
                print("Exiting ARIA...")
                break

            if keyboard.is_pressed('space'):
                if not recording:
                    print("\n[🎙️ Recording...] Speak now!")
                    recording = True
                    audio_data = []
                    # Clear queue
                    while not q.empty():
                        q.get()
                
                while not q.empty():
                    audio_data.append(q.get())
                time.sleep(0.01) # Small sleep to prevent high CPU usage
            else:
                if recording:
                    print("[🔄 Processing...] Transcribing...")
                    recording = False
                    while not q.empty():
                        audio_data.append(q.get())
                    
                    if len(audio_data) > 0:
                        audio_np = np.concatenate(audio_data, axis=0)
                        temp_wav = "temp_recording.wav"
                        sf.write(temp_wav, audio_np, fs)
                        
                        duration = len(audio_np) / fs
                        print(f"[Debug] Audio duration: {duration:.2f}s")
                        
                        try:
                            # 1. Transcribe
                            text = stt.transcribe(temp_wav)
                            print(f"\nUser: {text}")

                            if len(text.strip()) > 1:
                                # 2. Process through conversation manager (DB + LLM)
                                print("[🧠 Thinking...]")
                                response = manager.process_user_input(text)
                                print(f"\nARIA: {response}")
                                
                                # 3. Text to speech
                                print("[🔊 Speaking...]")
                                tts.speak(response)
                            else:
                                print("Didn't catch that.")
                        except Exception as e:
                            print(f"Error during processing: {e}")
                            
                        print("\nReady. Hold 'SPACE' to talk or 'ESC' to exit.")
                time.sleep(0.05)

if __name__ == "__main__":
    main()
