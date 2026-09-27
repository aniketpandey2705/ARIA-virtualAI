/**
 * ARIA — Electron Renderer
 * Handles voice recording, text chat, and communication with Python backend.
 */

const API_BASE = 'http://127.0.0.1:5000';

// ============================
// DOM Elements
// ============================
const loadingScreen = document.getElementById('loading-screen');
const loadingStatus = document.getElementById('loading-status');
const appContainer = document.getElementById('app-container');
const chatScroll = document.getElementById('chat-scroll');
const welcomeSection = document.getElementById('welcome-section');
const textInput = document.getElementById('text-input');
const sendBtn = document.getElementById('send-btn');
const voiceBtn = document.getElementById('voice-btn');
const voiceHint = document.getElementById('voice-hint');
const statusDot = document.getElementById('status-dot');
const statusText = document.getElementById('status-text');

// ============================
// State
// ============================
let isRecording = false;
let mediaRecorder = null;
let audioChunks = [];
let isProcessing = false;
let audioContext = null;

// ============================
// Window Controls
// ============================
document.getElementById('btn-minimize').addEventListener('click', () => window.electronAPI.minimize());
document.getElementById('btn-maximize').addEventListener('click', () => window.electronAPI.maximize());
document.getElementById('btn-close').addEventListener('click', () => window.electronAPI.close());

// ============================
// Initialization
// ============================
async function init() {
  setStatus('connecting', 'Connecting to backend...');
  loadingStatus.textContent = 'Waiting for backend...';

  // Poll until backend is ready
  let retries = 0;
  const maxRetries = 60; // 30 seconds

  while (retries < maxRetries) {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      const data = await res.json();
      
      if (data.initialized) {
        loadingStatus.textContent = 'ARIA is ready!';
        await sleep(600);
        showApp();
        loadHistory();
        return;
      } else {
        loadingStatus.textContent = 'Loading AI models...';
      }
    } catch (e) {
      // Server not up yet
    }

    retries++;
    await sleep(500);
  }

  loadingStatus.textContent = 'Could not connect. Make sure backend is running.';
  setStatus('error', 'Disconnected');
}

function showApp() {
  loadingScreen.classList.add('fade-out');
  setTimeout(() => {
    loadingScreen.style.display = 'none';
    appContainer.style.display = 'flex';
    setStatus('ready', 'Ready');
    textInput.focus();
  }, 400);
}

// ============================
// Chat History
// ============================
async function loadHistory() {
  try {
    const res = await fetch(`${API_BASE}/api/history?limit=50`);
    const data = await res.json();
    
    if (data.messages && data.messages.length > 0) {
      welcomeSection.style.display = 'none';
      data.messages.forEach(msg => {
        addMessage(msg.role === 'user' ? 'user' : 'aria', msg.content, false);
      });
      scrollToBottom();
    }
  } catch (e) {
    console.log('Could not load history:', e);
  }
}

// ============================
// Message Rendering
// ============================
function addMessage(sender, text, animate = true) {
  // Hide welcome on first message
  if (welcomeSection) {
    welcomeSection.style.display = 'none';
  }

  const msgEl = document.createElement('div');
  msgEl.className = `message message-${sender}`;
  if (!animate) msgEl.style.animation = 'none';

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = sender === 'user' ? 'You' : 'ARIA';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble';
  bubble.textContent = text;

  msgEl.appendChild(label);
  msgEl.appendChild(bubble);
  chatScroll.appendChild(msgEl);

  scrollToBottom();
  return msgEl;
}

function addThinking() {
  const msgEl = document.createElement('div');
  msgEl.className = 'message message-aria';
  msgEl.id = 'thinking-msg';

  const label = document.createElement('div');
  label.className = 'message-label';
  label.textContent = 'ARIA';

  const bubble = document.createElement('div');
  bubble.className = 'message-bubble thinking-indicator';

  for (let i = 0; i < 3; i++) {
    const dot = document.createElement('div');
    dot.className = 'thinking-dot';
    bubble.appendChild(dot);
  }

  msgEl.appendChild(label);
  msgEl.appendChild(bubble);
  chatScroll.appendChild(msgEl);
  scrollToBottom();
}

function removeThinking() {
  const el = document.getElementById('thinking-msg');
  if (el) el.remove();
}

function scrollToBottom() {
  requestAnimationFrame(() => {
    chatScroll.scrollTop = chatScroll.scrollHeight;
  });
}

// ============================
// Text Input
// ============================
textInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendTextMessage();
  }
});

sendBtn.addEventListener('click', sendTextMessage);

async function sendTextMessage() {
  const text = textInput.value.trim();
  if (!text || isProcessing) return;

  textInput.value = '';
  addMessage('user', text);
  
  await processChat(text);
}

// ============================
// Voice Recording
// ============================
voiceBtn.addEventListener('mousedown', startRecording);
voiceBtn.addEventListener('mouseup', stopRecording);
voiceBtn.addEventListener('mouseleave', () => {
  if (isRecording) stopRecording();
});

// Touch support
voiceBtn.addEventListener('touchstart', (e) => {
  e.preventDefault();
  startRecording();
});
voiceBtn.addEventListener('touchend', (e) => {
  e.preventDefault();
  stopRecording();
});

// Keyboard: Hold Space to record
document.addEventListener('keydown', (e) => {
  if (e.code === 'Space' && !isRecording && !isProcessing && document.activeElement !== textInput) {
    e.preventDefault();
    startRecording();
  }
});

document.addEventListener('keyup', (e) => {
  if (e.code === 'Space' && isRecording) {
    e.preventDefault();
    stopRecording();
  }
});

async function startRecording() {
  if (isRecording || isProcessing) return;

  try {
    const stream = await navigator.mediaDevices.getUserMedia({ 
      audio: { 
        sampleRate: 16000, 
        channelCount: 1,
        echoCancellation: true,
        noiseSuppression: true
      } 
    });

    audioChunks = [];
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });

    mediaRecorder.ondataavailable = (e) => {
      if (e.data.size > 0) {
        audioChunks.push(e.data);
      }
    };

    mediaRecorder.start(100); // Collect in 100ms chunks
    isRecording = true;
    voiceBtn.classList.add('recording');
    voiceHint.textContent = 'Listening...';
    voiceHint.style.color = '#ef4444';
    setStatus('ready', 'Recording...');
  } catch (err) {
    console.error('Microphone access denied:', err);
    setStatus('error', 'Mic access denied');
  }
}

async function stopRecording() {
  if (!isRecording || !mediaRecorder) return;

  isRecording = false;
  voiceBtn.classList.remove('recording');
  voiceHint.textContent = 'Hold to speak';
  voiceHint.style.color = '';

  mediaRecorder.stop();

  // Wait for final data
  await new Promise(resolve => {
    mediaRecorder.onstop = resolve;
  });

  // Stop all tracks
  mediaRecorder.stream.getTracks().forEach(t => t.stop());

  if (audioChunks.length === 0) {
    setStatus('ready', 'Ready');
    return;
  }

  // Convert webm to wav for the backend
  voiceBtn.classList.add('processing');
  voiceHint.textContent = 'Processing...';
  setStatus('connecting', 'Transcribing...');

  try {
    const webmBlob = new Blob(audioChunks, { type: 'audio/webm' });
    const wavBlob = await convertToWav(webmBlob);
    
    // Send to transcription endpoint
    const formData = new FormData();
    formData.append('audio', wavBlob, 'recording.wav');

    const res = await fetch(`${API_BASE}/api/transcribe`, { method: 'POST', body: formData });
    const data = await res.json();

    voiceBtn.classList.remove('processing');
    voiceHint.textContent = 'Hold to speak';

    if (data.text && data.text.trim().length > 1) {
      addMessage('user', data.text);
      await processChat(data.text);
    } else {
      setStatus('ready', 'Ready');
    }
  } catch (err) {
    console.error('Transcription error:', err);
    voiceBtn.classList.remove('processing');
    voiceHint.textContent = 'Hold to speak';
    setStatus('error', 'Transcription failed');
    setTimeout(() => setStatus('ready', 'Ready'), 3000);
  }
}

// ============================
// Convert WebM to WAV
// ============================
async function convertToWav(webmBlob) {
  if (!audioContext) {
    audioContext = new AudioContext({ sampleRate: 16000 });
  }

  const arrayBuffer = await webmBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

  // Get mono channel
  const channelData = audioBuffer.getChannelData(0);
  const sampleRate = audioBuffer.sampleRate;

  // Resample to 16000 if needed
  let samples = channelData;
  if (sampleRate !== 16000) {
    const ratio = 16000 / sampleRate;
    const newLength = Math.round(channelData.length * ratio);
    samples = new Float32Array(newLength);
    for (let i = 0; i < newLength; i++) {
      const srcIdx = i / ratio;
      const idx = Math.floor(srcIdx);
      const frac = srcIdx - idx;
      samples[i] = channelData[idx] * (1 - frac) + (channelData[idx + 1] || 0) * frac;
    }
  }

  // Encode as 16-bit PCM WAV
  const numSamples = samples.length;
  const buffer = new ArrayBuffer(44 + numSamples * 2);
  const view = new DataView(buffer);

  // WAV header
  writeString(view, 0, 'RIFF');
  view.setUint32(4, 36 + numSamples * 2, true);
  writeString(view, 8, 'WAVE');
  writeString(view, 12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, 1, true);
  view.setUint32(24, 16000, true);
  view.setUint32(28, 32000, true);
  view.setUint16(32, 2, true);
  view.setUint16(34, 16, true);
  writeString(view, 36, 'data');
  view.setUint32(40, numSamples * 2, true);

  // Write samples
  let offset = 44;
  for (let i = 0; i < numSamples; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    view.setInt16(offset, s * 0x7fff, true);
    offset += 2;
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

function writeString(view, offset, str) {
  for (let i = 0; i < str.length; i++) {
    view.setUint8(offset + i, str.charCodeAt(i));
  }
}

// ============================
// Chat Processing & TTS
// ============================
async function processChat(text) {
  isProcessing = true;
  addThinking();
  setStatus('connecting', 'Thinking...');

  try {
    const res = await fetch(`${API_BASE}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });
    const data = await res.json();

    removeThinking();

    if (data.response) {
      addMessage('aria', data.response);
      setStatus('connecting', 'Speaking...');

      // Play TTS
      await playTTS(data.response);
    } else if (data.error) {
      addMessage('aria', `Error: ${data.error}`);
    }
  } catch (err) {
    removeThinking();
    addMessage('aria', 'Could not reach ARIA backend.');
    console.error('Chat error:', err);
  }

  isProcessing = false;
  setStatus('ready', 'Ready');
}

async function playTTS(text) {
  try {
    const res = await fetch(`${API_BASE}/api/speak`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text })
    });

    if (!res.ok) return;

    const audioBlob = await res.blob();
    const audioUrl = URL.createObjectURL(audioBlob);
    const audio = new Audio(audioUrl);

    await new Promise((resolve) => {
      audio.onended = resolve;
      audio.onerror = resolve;
      audio.play().catch(resolve);
    });

    URL.revokeObjectURL(audioUrl);
  } catch (err) {
    console.error('TTS playback error:', err);
  }
}

// ============================
// Status Management
// ============================
function setStatus(state, text) {
  statusDot.className = 'status-dot';
  if (state === 'connecting') statusDot.classList.add('connecting');
  if (state === 'error') statusDot.classList.add('error');
  statusText.textContent = text;
}

// ============================
// Utilities
// ============================
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Listen for Python backend logs
if (window.electronAPI) {
  window.electronAPI.onPythonLog((msg) => {
    console.log('[Backend]', msg);
    if (msg.includes('ARIA Server is Ready')) {
      // Backend is up
    }
  });
}

// ============================
// Start
// ============================
init();
