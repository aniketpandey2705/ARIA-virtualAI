"""
ARIA Backend Server
Flask-based server exposing STT, LLM, and TTS via REST + WebSocket.
The Electron frontend communicates with this server.
"""

import sys
import os
import json
import base64
import tempfile
import threading

# Add the current directory to sys.path
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_socketio import SocketIO, emit

from voice.stt import SpeechToText
from voice.tts import TextToSpeech
from brain.conversation import ConversationManager

app = Flask(__name__)
CORS(app)
socketio = SocketIO(app, cors_allowed_origins="*", async_mode='threading')

# Global instances
stt = None
tts = None
manager = None
is_initialized = False
init_lock = threading.Lock()


def initialize_aria():
    """Initialize all ARIA components."""
    global stt, tts, manager, is_initialized
    with init_lock:
        if is_initialized:
            return True
        try:
            print("Initializing ARIA...")
            
            print("Loading Speech-to-Text (faster-whisper)...")
            stt = SpeechToText(model_size="small.en")
            
            print("Loading Text-to-Speech...")
            tts = TextToSpeech()
            
            print("Loading Conversation Manager & Memory DB...")
            manager = ConversationManager()
            
            is_initialized = True
            print("\nARIA Server is Ready.")
            return True
        except Exception as e:
            print(f"Initialization error: {e}")
            return False


@app.route('/api/health', methods=['GET'])
def health():
    return jsonify({"status": "ok", "initialized": is_initialized})


@app.route('/api/init', methods=['POST'])
def init():
    """Initialize ARIA components on demand."""
    success = initialize_aria()
    return jsonify({"success": success, "initialized": is_initialized})


@app.route('/api/transcribe', methods=['POST'])
def transcribe():
    """Receive audio (WAV) and return transcribed text."""
    if not is_initialized:
        return jsonify({"error": "ARIA not initialized"}), 503

    if 'audio' not in request.files:
        return jsonify({"error": "No audio file provided"}), 400

    audio_file = request.files['audio']
    
    # Save to temp file
    temp_path = os.path.join(tempfile.gettempdir(), "aria_recording.wav")
    audio_file.save(temp_path)
    
    try:
        text = stt.transcribe(temp_path)
        return jsonify({"text": text})
    except Exception as e:
        return jsonify({"error": str(e)}), 500
    finally:
        if os.path.exists(temp_path):
            os.remove(temp_path)


@app.route('/api/chat', methods=['POST'])
def chat():
    """Process text through the conversation manager and return response."""
    if not is_initialized:
        return jsonify({"error": "ARIA not initialized"}), 503
    
    data = request.get_json()
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({"error": "No text provided"}), 400
    
    try:
        response = manager.process_user_input(text)
        return jsonify({"response": response})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/speak', methods=['POST'])
def speak():
    """Convert text to speech and return audio as WAV file."""
    if not is_initialized:
        return jsonify({"error": "ARIA not initialized"}), 503

    data = request.get_json()
    text = data.get('text', '').strip()
    
    if not text:
        return jsonify({"error": "No text provided"}), 400

    try:
        # Clean text
        text = text.replace('*', '')
        
        # Generate audio samples
        samples, sample_rate = tts.kokoro.create(
            text,
            voice="af_bella",
            speed=1.0,
            lang="en-us"
        )
        
        # Save to temp WAV file
        import soundfile as sf
        temp_path = os.path.join(tempfile.gettempdir(), "aria_tts_output.wav")
        sf.write(temp_path, samples, sample_rate)
        
        return send_file(temp_path, mimetype='audio/wav')
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/history', methods=['GET'])
def get_history():
    """Get recent conversation history."""
    if not is_initialized:
        return jsonify({"error": "ARIA not initialized"}), 503
    
    try:
        limit = request.args.get('limit', 50, type=int)
        messages = manager.db.get_recent_messages(limit=limit)
        return jsonify({"messages": messages})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


@app.route('/api/clear', methods=['POST'])
def clear_history():
    """Clear conversation history."""
    if not is_initialized:
        return jsonify({"error": "ARIA not initialized"}), 503
    
    try:
        cursor = manager.db.conn.cursor()
        cursor.execute('DELETE FROM conversation')
        manager.db.conn.commit()
        return jsonify({"success": True})
    except Exception as e:
        return jsonify({"error": str(e)}), 500


# WebSocket events for real-time communication
@socketio.on('connect')
def handle_connect():
    print("Client connected")
    emit('status', {'initialized': is_initialized})


@socketio.on('disconnect')
def handle_disconnect():
    print("Client disconnected")


@socketio.on('init')
def handle_init():
    success = initialize_aria()
    emit('init_result', {'success': success})


if __name__ == '__main__':
    # Auto-initialize on startup
    initialize_aria()
    
    print("\nStarting ARIA server on http://localhost:5000")
    socketio.run(app, host='127.0.0.1', port=5000, debug=False, allow_unsafe_werkzeug=True)
