# शाश्वत AI Assistant — Windows Desktop AI Operating System

**शाश्वत** is a production-ready Windows Desktop AI Operating System and AI companion powered by **Gemini Live API**, **Electron**, **React 19**, **Three.js**, **Playwright**, and **Voice Biometrics**.

It is not a text chatbot — it lives directly on your computer:
- **Voice-to-Voice AI**: Always-on wake word ("शाश्वत"), continuous audio streaming, speaker biometrics verification.
- **Desktop & OS Automation**: Launches apps, minimizes/moves windows, adjusts system volume/brightness, captures screenshots, reads/writes files.
- **Autonomous Sandbox Browser**: Built-in Playwright Chromium engine for automated research, web navigation, and form filling.
- **Document Intelligence**: Deep research workspace supporting PDF, DOCX, XLSX, PPTX, Code, Images with OCR, citations, and interactive study tools (MCQs, Flashcards, Mind Maps).
- **Hologram Core**: 60 FPS Three.js particle canvas engine reacting in real time to microphone audio.

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Electron Main Process (electron/main.cjs)               │
│  • System Tray   • Window Controls   • OS Notifications   • Auto-Updater    │
└──────────────────────────────────────┬──────────────────────────────────────┘
                                       │
           ┌───────────────────────────┴───────────────────────────┐
           ▼                                                       ▼
[Node Server Engine: server.ts]                    [React 19 Frontend: src/]
• Gemini Live WebSocket Client                     • Hologram Particle Core (Three.js)
• Real Tools (Apps, Files, Input, Browser)         • Voice Identity & Enrollment Modal
• Document Intelligence & Knowledge Index          • Document Research Workspace
• Voice Biometrics Engine (speakerVerification.ts) • HUD Event Logs & Health-App Widgets
```

---

## Desktop Installation & Build Instructions

### Prerequisites
- **Node.js**: v18+ (tested on v24.x)
- **OS**: Windows 10 / 11
- **API Key**: Gemini API key from [Google AI Studio](https://aistudio.google.com)

### 1. Developer Setup
```bash
# Clone repository
git clone https://github.com/Vikaskajla26/shashwat-ai-assistant.git
cd shashwat-ai-assistant

# Install dependencies
npm install

# Install Playwright Chromium browser
npx playwright install chromium

# Create .env.local file with your Gemini API key:
GEMINI_API_KEY="your_gemini_api_key_here"

# Run dev server (Browser Web App)
npm run dev

# Run Desktop Application (Electron Dev Mode)
npm run electron:dev
```

---

### 2. Building Professional Windows Installer (.exe)

To generate the standalone **Windows NSIS Installer (`.exe`)** and **Portable Executable**:

```bash
# Type-check codebase
npm run lint

# Build production bundle and package Windows installer
npm run dist
```

The compiled binaries will be generated inside the `release/` directory:
- `release/शाश्वत AI Assistant Setup 1.0.0.exe` (Professional Windows Installer)
- `release/शाश्वत AI Assistant 1.0.0.exe` (Standalone Portable Executable)

---

## Key Features & Keyboard Shortcuts

- **Wake Word**: Say `"शाश्वत"` or `"shashwat"` to awaken the assistant anytime.
- **Voice Identity Enrollment**: Click **VOICE ID** in top bar to lock personal memories to your voice.
- **Document Intelligence Workspace**: Click **DOCS INTEL** or press icon in toolbar to drag-and-drop PDFs, code, spreadsheets, or images.
- **Screen Share**: Click **SHARE SCREEN** to activate visual assistant screen understanding.
- **System Settings & Moods**: Change assistant personality between Witty, Playful, Focused, Charming, and Energetic.

---

## Safety & Security Layer

- **Harmless Actions** (App launch, web search, volume adjustment) run immediately.
- **High-Risk Actions** (File deletion, system configuration changes) require explicit voice confirmation.
- **Speaker Biometrics**: Unrecognized guest voices are strictly gated from personal memory and file operations.

---

## Troubleshooting

- **Microphone Access**: Ensure microphone permissions are enabled in Windows Privacy Settings.
- **Port 3000 busy**: Close any process running on port 3000 or restart the server.
- **nircmd**: Automatically downloaded on first launch into `./bin/nircmd.exe` for native Windows audio controls.
