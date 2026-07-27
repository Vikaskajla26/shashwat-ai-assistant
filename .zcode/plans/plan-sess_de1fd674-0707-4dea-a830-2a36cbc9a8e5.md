# शाश्वत — Make the Tool Layer Real

## Problem (what's broken today)
The system prompt promises शाश्वत is a real AI Operating System, and the model faithfully calls tools like `launch_app`, `system_control`, `browser_navigate`, `file_operation`, `media_control`. But `ToolManager.ts` runs **in the browser**, where it is technically impossible to launch desktop apps, change volume/brightness, take a desktop screenshot, read/write real files, or click/scroll a real page. So nearly every tool **fakes success** — it returns `{ status: 'success' }` and shows a card while doing nothing. This violates the project's own TRANSPARENCY rule.

Root cause: tool execution lives on the wrong side of the WebSocket. The fix is to move it onto the Node backend (which has real OS access), behind a safety/confirmation layer — exactly the "Recommended Architecture" you pasted.

## Target Architecture
```
Browser (React)                         Node Server (server.ts + server/tools/)
├─ LiveSession (WS client)      ←ws→    ├─ Gemini Live connect
├─ UI-only tool exec:                   │   └─ on toolCall → route:
│   • changeAssistantMood               │       ├─ OS/file/input/browser/memory → ToolExecutor (REAL)
│   • showVisualCard                    │       │     ├─ apps.ts, system.ts, media.ts, files.ts
│   • (real, server-verified) display   │       │     ├─ input.ts, browser.ts (Playwright), systemInfo.ts
│                                        │       │     └─ safety.ts (risk class + confirm)
│                                        │       └─ UI tools (mood/card) → forward to client (as today)
└─ Audio + Screen streamers             ├─ Result → sendToolResponse(Gemini) directly + toolEvent→client
```
Key change: the server executes the real tools itself and returns results to Gemini **directly** (no client round-trip). The client keeps only React-state tools (mood, card) and receives `toolEvent`/card events for display.

Note: the **server already owns the tool declarations** Gemini sees (`ai.live.connect({config:{tools}})` in server.ts). The client's `setup.tools` message is received but ignored — so the server is the natural home for a consolidated declaration list.

## Design Decisions (locked)
- **Voice confirmation** via Gemini's native turn-taking: a high-risk tool first returns `{ status: "confirmation_required", question }`. Updated system instruction tells the model to ask the user a yes/no aloud, wait, and re-call the same tool with `confirmed: true`. On `confirmed: true` the server executes for real. No separate TTS engine needed — leverages the existing streaming audio loop.
- **Input tooling**: `nircmd.exe` (portable NirSoft exe) for volume/mute/brightness/lock/screenshot/media keys; .NET `SendInput` via PowerShell for global mouse/keyboard injection. AutoHotkey noted as optional upgrade if SendInput proves flaky on a specific window.
- **Browser automation**: Playwright with a persistent, isolated user-data-dir profile so cookies/sessions survive across runs (the "autonomous sandbox workspace").
- **Memory** moves server-side (JSON file) for persistence and direct model access.

---

## Implementation Plan (phased; verify after each)

### Phase 1 — Backend tool executor + routing
- Create `server/tools/` with: `declarations.ts` (consolidated, authoritative tool list), `index.ts` (`ToolExecutor` + name→handler routing), `safety.ts`.
- In `server.ts` Gemini `onmessage`: on `toolCall`, route by name. Real tools → `ToolExecutor.execute()`; then call `liveSession.sendToolResponse({functionResponses:[{id,name,response}]})` in-process; also emit a `toolEvent` (+ card where useful) to the client WS for UI. UI-only tools (`changeAssistantMood`, `showVisualCard`) → forward to client as today and let the client return the response.
- Add optional `confirmed?: boolean` param to every high-risk tool declaration.
- `LiveSession.ts`: when a forwarded UI tool completes, behavior unchanged. Real tools no longer pass through the client executor.
- Memory modules (`MemoryManager`) ported to Node + JSON-file backing inside `server/tools/memory.ts`; declarations reuse existing categories.

### Phase 2 — Real Windows OS tools
- `apps.ts`: resolve app names via a known-app map + Windows Start Menu/`App Paths` registry lookup (`powershell Start-Process`); reuse running instance where possible.
- `system.ts` + `media.ts` (via nircmd): `changesysvolume`, `mutesysvolume`, `monitor off`/lock, `savescreenshot`, brightness, media transport keys (play/pause/next/prev), show desktop, close window (SendInput Alt+F4 / `taskkill` for the focused window).
- `files.ts`: real `fs` create folder/file, open Downloads/Documents (`explorer`), recursive search, and **delete** (gated by safety). `create_file` writes to disk (not a browser download).
- `input.ts`: mouse move/click/drag/scroll + keyboard type/shortcuts via PowerShell `SendInput` (and `nircmd sendkey` for media/system keys).
- `systemInfo.ts`: real time/timezone/screen resolution/OS/online state.
- `open_website` / `search_web` / `searchGoogle` / `searchYouTube`: open in the **real system default browser** via `start <url>` (Windows), not `window.open`.
- `nircmd.ts`: locate `nircmd.exe` in `bin/` or PATH; if missing, download from NirSoft on first use (you approved external helper). Document manual fallback in README.

### Phase 3 — Safety / voice confirmation layer
- `safety.ts`: classify each (tool, args) as LOW (execute immediately) or HIGH (confirm first). HIGH = delete/format/uninstall/install/purchase/send-email/submit-payment-form/system-config-change/destructive-terminal/close-unsaved.
- Confirmation protocol: HIGH actions with no `confirmed: true` return `{ status:"confirmation_required", question, action, args }` and do NOT execute. With `confirmed: true`, execute.
- Rewrite the `systemInstruction` section to: (a) state tools are now REAL, (b) require verification before claiming success, (c) encode the confirmation protocol (ask yes/no aloud, never proceed without an explicit yes, re-call with confirmed=true), (d) keep the existing personality/voice/Hindi-first rules.

### Phase 4 — Playwright browser automation (real `browser_navigate` / sandbox)
- `browser.ts`: lazily launch Playwright Chromium with a persistent context; maintain a tab/manager; methods per `browser_navigate` action: click, scroll, fill_form, read_page (return extracted text), summarize_page (return key text for the model), compare_products (open N tabs, extract specs/prices, return structured data), switch_tab/close_tab/bookmark/download_file/research_topic/video_control.
- `browser_sandbox_exec` + `sandbox_tab_manager` drive the same Playwright instance for multi-tab research.
- Real page content is returned in the tool response so the model reasons over actual data instead of fabricating cards.

### Phase 5 — Client cleanup + docs + verification
- Trim `ToolManager.ts` to UI-only tools (`changeAssistantMood`, `showVisualCard`); delete all fake branches so the app can no longer "lie" about actions.
- Keep `AISandboxBrowser` / `ToolActionBanner` / `VisualCardOverlay` fed by server `toolEvent`/card messages.
- Update `package.json` (`playwright` dep), `.env.example` (GEMINI_API_KEY note), `README.md` (install: `npm install`, `npx playwright install chromium`, nircmd note, `npm run dev`).
- Verification per phase: launch real apps, change real volume, real screenshot to disk, create+delete a file (with confirmation), real Google search in default browser, Playwright read a page and return its text, high-risk delete triggers a spoken yes/no before executing.

## New dependencies
- `playwright` (run `npx playwright install chromium` once).
- `nircmd.exe` (downloaded to `bin/`, or manual). No AHK installer required by default.

## Notes
- This is a large build; I'll implement it phase by phase, verifying each phase before moving on, and keep you informed at each step.
- Existing model (`gemini-3.1-flash-live-preview`) and the WS protocol shape are preserved — only routing/execution moves server-side.
- No Git repo present; I will not initialize one unless you ask.