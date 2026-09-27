# ARIA - Local Multimodal AI Assistant

ARIA is a locally hosted, privacy-first AI desktop voice assistant. It features a modern, ultra-minimal "Detroit: Become Human" style UI built with Electron, and is powered completely by local, open-source AI models.

## Features
- **Voice Interaction**: Push-to-talk voice recording using a modern Electron desktop UI.
- **Speech-to-Text (STT)**: Powered by `faster-whisper` for lightning-fast, local transcription.
- **Language & Vision (LLM)**: Powered by `Ollama` (running `llava` or `llama3.2`). ARIA can answer questions and even "see" your screen if you ask her to look at something.
- **Text-to-Speech (TTS)**: Powered by `Kokoro` for ultra-realistic, human-like voice generation.
- **Privacy First**: Everything runs locally on your hardware. No API keys, no cloud servers.

---

## Prerequisites
Before you begin, ensure you have the following installed on your machine:
- **Python 3.10+** (Tested on Python 3.14)
- **Node.js & npm** (For the Electron frontend)
- **Ollama** ([Download here](https://ollama.com/)) - Must be running in the background.

---

## Setup Instructions

### 1. Set up the LLM (Ollama)
Ensure Ollama is running, then open a terminal and pull your preferred model.
If you have **8GB+ VRAM** and want screen-vision capabilities, use `llava`:
```bash
ollama pull llava
```
If you have **<8GB VRAM** and want a fast, text-only assistant, use `llama3.2`:
```bash
ollama pull llama3.2
```
*(Note: If you use `llama3.2`, make sure to update the model name in `backend/brain/llm.py` and `backend/brain/conversation.py`)*

### 2. Set up the Python Backend
Open a terminal in the root directory of the project and set up a virtual environment:
```bash
python -m venv venv
.\venv\Scripts\activate
```
Install the required Python packages:
```bash
pip install -r requirements.txt
```

### 3. Set up the Kokoro TTS Models
You need to download the Kokoro model files and place them in the correct directory.
1. Create the following folder structure in the root of the project: `models/kokoro/`
2. Download `kokoro-v0_19.onnx` and `voices.bin` from the official Kokoro ONNX repository.
3. Place both files inside the `models/kokoro/` folder.

### 4. Set up the Electron Frontend
Open a new terminal (or use the same one) and navigate to the `electron` directory:
```bash
cd electron
npm install
```

---

## How to Run

ARIA includes a convenient batch script that starts both the Python backend and the Electron UI automatically.

From the root directory, simply run:
```bash
.\start-aria.bat
```

### Manual Start (Alternative)
If you prefer to start the components manually for debugging:
1. **Start the Backend:**
   ```bash
   .\venv\Scripts\activate
   python backend\server.py
   ```
2. **Start the Frontend:**
   Open a new terminal:
   ```bash
   cd electron
   npm start
   ```

## Usage
- The app will launch as a frameless, dark window.
- Wait for the status indicator at the bottom to say "Ready" (green dot).
- Click and **HOLD** the glowing cyan microphone button (or hold the `SPACE` bar) to record your voice.
- Release to send your audio to ARIA.
- You can also type commands directly into the text input box.
