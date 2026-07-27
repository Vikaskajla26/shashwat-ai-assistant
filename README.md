# शाश्वत AI Assistant

Real-time, voice-to-voice AI desktop assistant powered by Gemini Live API.

शाश्वत is not a chatbot — it's an AI operating system that genuinely controls the user's computer:
launches apps, opens websites in the real default browser, changes volume/brightness,
takes screenshots, reads/writes/deletes files, clicks and types on any window,
and autonomously researches across browser tabs via Playwright.

## Prerequisites

- **Node.js** v18+ (tested on v24.x)
- **Windows 10/11** (uses PowerShell + nircmd for OS control)
- **Gemini API key** from [Google AI Studio](https://aistudio.google.com)

## Setup

```bash
# 1. Install dependencies
npm install

# 2. Install Playwright Chromium (for browser automation)
npx playwright install chromium

# 3. Set your Gemini API key
#    Create .env.local with:
GEMINI_API_KEY="your_key_here"

# 4. Run the dev server
npm run dev
```

### nircmd (auto-downloaded)

nircmd.exe is used for volume, mute, media keys, and other Windows controls.
On first use it is automatically downloaded from NirSoft into `./bin/`.
If the auto-download fails, manually download [nircmd-x64.zip](https://www.nirsoft.net/utils/nircmd.html)
and place `nircmd.exe` in the `bin/` folder.

## Architecture

```
Browser (React)                           Node Server (server.ts)
├─ LiveSession (WebSocket client)   ←→    ├─ Gemini Live connect
├─ ToolManager (UI-only: mood, card)       │   └─ on toolCall → execute on server
├─ AudioStreamer / AudioPlayer             │       ├─ apps.ts, system.ts, media.ts
├─ ScreenStreamer                          │       ├─ files.ts, input.ts, browser.ts
└─ UI components                           │       ├─ memory.ts, systemInfo.ts
                                           │       └─ safety.ts (confirmation layer)
                                           └─ toolEvent/card → client for display
```

**Real tools execute server-side** where they have OS access.
Only UI tools (mood change, visual cards) execute in the browser.

## Safety Layer

- **Harmless actions** (open app, search, volume) → execute immediately
- **High-risk actions** (delete files, purchases, system changes) → voice confirmation required

When the model tries a high-risk action, it receives a `confirmation_required` response,
asks the user aloud, and only proceeds after a clear "yes" is spoken.

## Memory

Long-term memory is persisted to `data/memory.json` on disk, surviving server restarts.
The model classifies facts as HIGH/MEDIUM/LOW importance; only HIGH and MEDIUM are stored.

## Development

```bash
npm run dev      # Start dev server (Express + Vite HMR)
npm run build    # Production build
npm run lint     # TypeScript check
```
