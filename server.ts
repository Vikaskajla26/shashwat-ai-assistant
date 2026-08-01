import dotenv from "dotenv";
import express from "express";
import http from "http";
import path from "path";

dotenv.config();
dotenv.config({ path: ".env.local" });
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { TOOL_DECLARATIONS } from "./server/tools/declarations";
import { executeTool, isClientSideTool } from "./server/tools";
import { SYSTEM_INSTRUCTION } from "./server/systemInstruction";
import fs from "fs";
import { enrollVoiceprint, verifySpeaker, getVoiceprint, deleteVoiceprint } from "./server/voice/speakerVerification";
import { KnowledgeIndex } from "./server/docIntel/knowledgeIndex";
import { StudyGenerator } from "./server/docIntel/studyGenerator";
import { runHealthChecks } from "./server/registry/selfTest";
import { getRegistry, getTaskMeta, validateConsistency } from "./server/registry/taskRegistry";
import { getAggregateStats, getAllStats } from "./server/registry/metricsStore";
import { getFourSystemsState } from "./server/selfLearningEngine";
import { REGISTERED_COMMANDS, processStudyCommand } from "./server/docIntel/commandProcessor";
import { getDB, closeDB } from "./server/db/database";
import {
  getClientProviderMetas,
  loadAllProviderConfigs,
  saveAllProviderConfigs,
  getActiveProvider,
  AIProviderId,
} from "./server/providers/providerStorage";
import { AIProviderManager } from "./server/providers/aiProviderManager";
import { loadAppState, saveAppState } from "./server/utils/persistenceManager";
import { testAutomatedWorkflows } from "./server/tools/browser";

const LIVE_MODEL = "gemini-3.1-flash-live-preview";

async function startServer() {
  // Initialize database on startup
  try {
    await getDB();
    console.log('[Database] SQLite database initialized successfully');
  } catch (err) {
    console.error('[Database] Failed to initialize database:', err);
  }

  // ── Migrate stored Gemini model to Live-preview if still on old text-only default ──
  try {
    const configs = loadAllProviderConfigs();
    const gemini = configs['gemini'];
    if (gemini && gemini.selectedModel !== LIVE_MODEL) {
      const oldModel = gemini.selectedModel;
      configs['gemini'] = { ...gemini, selectedModel: LIVE_MODEL, status: 'unconfigured', lastError: undefined };
      saveAllProviderConfigs(configs);
      console.log(`[Provider] Migrated Gemini model: ${oldModel} → ${LIVE_MODEL}`);
    }
  } catch (_) {}

  const app = express();
  const preferredPort = parseInt(process.env.PORT || "3000", 10);
  const HOST = "0.0.0.0";

  app.use(express.json({ limit: "50mb" }));
  app.use(express.urlencoded({ extended: true, limit: "50mb" }));

  // Health check endpoint (static + probe result)
  app.get("/api/health", async (_req, res) => {
    try {
      const probe = await runHealthChecks();
      res.json({
        status: "ok",
        assistant: "शाश्वत AI Assistant",
        model: "gemini-3.1-flash-live-preview",
        time: new Date().toISOString(),
        score: probe.summary.score,
        passed: probe.summary.passed,
        total: probe.summary.total,
      });
    } catch {
      res.json({
        status: "ok",
        assistant: "शाश्वत AI Assistant",
        model: "gemini-3.1-flash-live-preview",
        time: new Date().toISOString(),
      });
    }
  });

  // Detailed health & self-test — real probe results from SelfTestRunner
  app.get(["/api/health/detailed", "/api/self-test"], async (_req, res) => {
    try {
      const report = await runHealthChecks();
      res.json({ success: true, ...report });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Health check failed" });
    }
  });

  // Task Registry & Tasks Endpoint — single source of truth
  app.get(["/api/registry", "/api/tasks"], (_req, res) => {
    const registry = getRegistry();
    const aggregate = getAggregateStats();
    const consistency = validateConsistency(registry.map((t) => t.name));
    res.json({ success: true, registry, aggregate, consistency });
  });

  // Task Stats & Metrics Endpoint — per-tool and aggregate metrics
  app.get(["/api/stats", "/api/metrics"], (_req, res) => {
    res.json({ success: true, aggregate: getAggregateStats(), tasks: getAllStats() });
  });

  // Errors Endpoint — Root Cause Error Intelligence Stats
  app.get("/api/errors", (_req, res) => {
    try {
      const state = getFourSystemsState();
      res.json({ success: true, errors: state.system2ErrorIntelligence });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Error stats failed" });
    }
  });

  // Four Systems Learning State — live (real metrics, not seed data)
  app.get("/api/learning", (_req, res) => {
    try {
      const state = getFourSystemsState();
      res.json({ success: true, ...state });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Learning state failed" });
    }
  });

  // Document Intelligence REST APIs
  app.get("/api/documents", (_req, res) => {
    const ki = KnowledgeIndex.getInstance();
    res.json({ success: true, documents: ki.listDocuments() });
  });

  app.post("/api/documents/upload", async (req, res) => {
    try {
      const { fileName, mimeType, base64 } = req.body || {};
      if (!fileName || !base64) {
        return res.status(400).json({ success: false, message: "fileName and base64 required" });
      }

      const tempDir = path.join(process.cwd(), "scratch");
      if (!fs.existsSync(tempDir)) fs.mkdirSync(tempDir, { recursive: true });

      const tempPath = path.join(tempDir, `upload_${Date.now()}_${path.basename(fileName)}`);
      fs.writeFileSync(tempPath, Buffer.from(base64, "base64"));

      const ki = KnowledgeIndex.getInstance();
      const meta = await ki.addDocument(tempPath, fileName, mimeType || "application/octet-stream");

      try { fs.unlinkSync(tempPath); } catch (_) {}
      res.json({ success: true, document: meta });
    } catch (err: any) {
      console.error("[DocUpload] Error:", err);
      res.status(500).json({ success: false, message: err?.message || "Upload failed" });
    }
  });

  app.delete("/api/documents/:id", (req, res) => {
    const ki = KnowledgeIndex.getInstance();
    const ok = ki.deleteDocument(req.params.id);
    res.json({ success: ok, message: ok ? "Document deleted" : "Document not found" });
  });

  app.post("/api/documents/query", (req, res) => {
    const { query, docId } = req.body || {};
    const ki = KnowledgeIndex.getInstance();
    const result = ki.queryKnowledgeBase(query || "summary", docId);
    res.json({ success: true, result });
  });

  app.post("/api/documents/study", (req, res) => {
    const { docId } = req.body || {};
    const study = StudyGenerator.generateStudyMaterials(docId);
    res.json({ success: true, study });
  });

  // Slash Command Execution Endpoints
  app.get("/api/study/commands", (_req, res) => {
    res.json({ success: true, commands: REGISTERED_COMMANDS });
  });

  app.post("/api/study/command", async (req, res) => {
    try {
      const { command, docId } = req.body || {};
      const result = await processStudyCommand(command || "/notes", docId);
      res.json({ success: true, result });
    } catch (err: any) {
      console.error("[StudyCommand API] Error:", err);
      res.status(500).json({ success: false, message: err?.message || "Command execution failed" });
    }
  });

  app.post("/api/documents/compare", (req, res) => {
    const { docIds } = req.body || {};
    const ki = KnowledgeIndex.getInstance();
    const comparison = ki.compareDocuments(docIds);
    res.json({ success: true, comparison });
  });

  // AI Provider & Persistent Initialization Endpoints
  app.get("/api/ai/providers", (_req, res) => {
    try {
      const metas = getClientProviderMetas();
      const active = getActiveProvider();
      const state = loadAppState();
      res.json({
        success: true,
        isInitialized: state.isInitialized,
        providers: metas,
        active: active
          ? { id: active.id, name: active.name, model: active.selectedModel, status: active.status }
          : null,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Failed to load provider status" });
    }
  });

  app.get("/api/system/init-status", (_req, res) => {
    try {
      const state = loadAppState();
      const active = getActiveProvider();
      const hasConfiguredProvider = active && active.status !== "unconfigured";
      res.json({
        success: true,
        isInitialized: state.isInitialized && Boolean(hasConfiguredProvider),
        userProfile: state.userProfile,
        activeProvider: active ? { id: active.id, name: active.name, model: active.selectedModel } : null,
        browserRoutingMode: state.browserRoutingMode,
        theme: state.theme,
        wakeWord: state.wakeWord,
      });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Failed to check init status" });
    }
  });

  app.post("/api/system/reset-app", (req, res) => {
    try {
      const { id } = req.body || {};
      const manager = AIProviderManager.getInstance();
      manager.resetProvider(id || "gemini");
      saveAppState({ isInitialized: false });
      res.json({ success: true, message: "Application state reset successfully. Setup wizard will prompt on next launch." });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "App reset failed" });
    }
  });

  app.post("/api/ai/providers/validate", async (req, res) => {
    try {
      const { id, apiKey, selectedModel, customEndpoint } = req.body || {};
      const manager = AIProviderManager.getInstance();
      const result = await manager.validateProvider(id, apiKey, selectedModel, customEndpoint);
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Validation failed" });
    }
  });

  app.post("/api/ai/providers/save", async (req, res) => {
    try {
      const { id, apiKey, selectedModel, enabled, customEndpoint, userName } = req.body || {};
      const manager = AIProviderManager.getInstance();
      const result = await manager.saveProvider(id, apiKey, selectedModel, enabled, customEndpoint);
      if (result.success) {
        saveAppState({
          isInitialized: true,
          activeProviderId: id,
          selectedModel: selectedModel || "gemini-3.1-flash-live-preview",
          userProfile: {
            name: userName || "Vikas",
            createdAt: new Date().toISOString(),
            lastActiveAt: new Date().toISOString(),
          },
        });
      }
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Failed to save provider" });
    }
  });

  app.post("/api/ai/providers/reset", (req, res) => {
    try {
      const { id } = req.body || {};
      const manager = AIProviderManager.getInstance();
      const ok = manager.resetProvider(id);
      saveAppState({ isInitialized: false });
      res.json({ success: ok, message: ok ? "Provider reset successfully" : "Reset failed" });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Reset failed" });
    }
  });

  app.post("/api/browser/test-workflow", async (req, res) => {
    try {
      const { platform } = req.body || {};
      const result = await testAutomatedWorkflows(platform || "google");
      res.json(result);
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || "Workflow test failed" });
    }
  });

  // Database API endpoints for offline-first storage
  // User Memory
  app.get("/api/memory", async (_req, res) => {
    try {
      const db = await getDB();
      const memories = await db.all('SELECT key, value FROM user_memory');
      const result: Record<string, string> = {};
      memories.forEach(m => { result[m.key] = m.value; });
      res.json({ success: true, memories: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to load memory' });
    }
  });

  app.post("/api/memory", async (req, res) => {
    try {
      const { key, value } = req.body || {};
      if (!key || value === undefined) {
        return res.status(400).json({ success: false, message: 'key and value required' });
      }
      const db = await getDB();
      await db.run(
        'INSERT INTO user_memory (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
        [key, value]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to save memory' });
    }
  });

  app.delete("/api/memory/:key", async (req, res) => {
    try {
      const db = await getDB();
      await db.run('DELETE FROM user_memory WHERE key = ?', [req.params.key]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to delete memory' });
    }
  });

  // Settings
  app.get("/api/settings", async (_req, res) => {
    try {
      const db = await getDB();
      const settings = await db.all('SELECT key, value FROM settings');
      const result: Record<string, string> = {};
      settings.forEach(s => { result[s.key] = s.value; });
      res.json({ success: true, settings: result });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to load settings' });
    }
  });

  app.post("/api/settings", async (req, res) => {
    try {
      const { key, value } = req.body || {};
      if (!key || value === undefined) {
        return res.status(400).json({ success: false, message: 'key and value required' });
      }
      const db = await getDB();
      await db.run(
        'INSERT INTO settings (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP',
        [key, value]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to save setting' });
    }
  });

  // Conversation History
  app.get("/api/conversations/:sessionId", async (req, res) => {
    try {
      const db = await getDB();
      const conversations = await db.all(
        'SELECT role, content, timestamp FROM conversation_history WHERE session_id = ? ORDER BY timestamp ASC',
        [req.params.sessionId]
      );
      res.json({ success: true, conversations });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to load conversations' });
    }
  });

  app.post("/api/conversations", async (req, res) => {
    try {
      const { sessionId, role, content } = req.body || {};
      if (!sessionId || !role || !content) {
        return res.status(400).json({ success: false, message: 'sessionId, role, and content required' });
      }
      const db = await getDB();
      await db.run(
        'INSERT INTO conversation_history (session_id, role, content) VALUES (?, ?, ?)',
        [sessionId, role, content]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to save conversation' });
    }
  });

  // Bookmarks
  app.get("/api/bookmarks", async (_req, res) => {
    try {
      const db = await getDB();
      const bookmarks = await db.all('SELECT * FROM bookmarks ORDER BY created_at DESC');
      res.json({ success: true, bookmarks });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to load bookmarks' });
    }
  });

  app.post("/api/bookmarks", async (req, res) => {
    try {
      const { title, url, description } = req.body || {};
      if (!title || !url) {
        return res.status(400).json({ success: false, message: 'title and url required' });
      }
      const db = await getDB();
      await db.run('INSERT INTO bookmarks (title, url, description) VALUES (?, ?, ?)', [title, url, description || '']);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to save bookmark' });
    }
  });

  app.delete("/api/bookmarks/:id", async (req, res) => {
    try {
      const db = await getDB();
      await db.run('DELETE FROM bookmarks WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to delete bookmark' });
    }
  });

  // Study Workspace
  app.get("/api/study-workspace", async (_req, res) => {
    try {
      const db = await getDB();
      const items = await db.all('SELECT * FROM study_workspace ORDER BY updated_at DESC');
      res.json({ success: true, items });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to load study workspace' });
    }
  });

  app.post("/api/study-workspace", async (req, res) => {
    try {
      const { title, content, subject } = req.body || {};
      if (!title) {
        return res.status(400).json({ success: false, message: 'title required' });
      }
      const db = await getDB();
      await db.run(
        'INSERT INTO study_workspace (title, content, subject) VALUES (?, ?, ?)',
        [title, content || '', subject || '']
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to save study item' });
    }
  });

  app.put("/api/study-workspace/:id", async (req, res) => {
    try {
      const { title, content, subject } = req.body || {};
      const db = await getDB();
      await db.run(
        'UPDATE study_workspace SET title = ?, content = ?, subject = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?',
        [title, content || '', subject || '', req.params.id]
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to update study item' });
    }
  });

  app.delete("/api/study-workspace/:id", async (req, res) => {
    try {
      const db = await getDB();
      await db.run('DELETE FROM study_workspace WHERE id = ?', [req.params.id]);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to delete study item' });
    }
  });

  // Task History
  app.get("/api/task-history", async (_req, res) => {
    try {
      const db = await getDB();
      const tasks = await db.all('SELECT * FROM task_history ORDER BY started_at DESC LIMIT 100');
      res.json({ success: true, tasks });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to load task history' });
    }
  });

  app.post("/api/task-history", async (req, res) => {
    try {
      const { taskName, status, result } = req.body || {};
      if (!taskName || !status) {
        return res.status(400).json({ success: false, message: 'taskName and status required' });
      }
      const db = await getDB();
      await db.run(
        'INSERT INTO task_history (task_name, status, started_at, completed_at, result) VALUES (?, ?, ?, ?, ?)',
        [taskName, status, new Date().toISOString(), status === 'completed' ? new Date().toISOString() : null, result || '']
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to save task history' });
    }
  });

  // Automation History
  app.get("/api/automation-history", async (_req, res) => {
    try {
      const db = await getDB();
      const history = await db.all('SELECT * FROM automation_history ORDER BY executed_at DESC LIMIT 100');
      res.json({ success: true, history });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to load automation history' });
    }
  });

  app.post("/api/automation-history", async (req, res) => {
    try {
      const { action, target, parameters, success, result } = req.body || {};
      if (!action) {
        return res.status(400).json({ success: false, message: 'action required' });
      }
      const db = await getDB();
      await db.run(
        'INSERT INTO automation_history (action, target, parameters, success, result) VALUES (?, ?, ?, ?, ?)',
        [action, target || '', JSON.stringify(parameters || {}), success ? 1 : 0, result || '']
      );
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to save automation history' });
    }
  });

  // Logs
  app.get("/api/logs", async (req, res) => {
    try {
      const { level, limit = 100 } = req.query;
      const db = await getDB();
      let query = 'SELECT * FROM logs';
      const params: any[] = [];
      if (level) {
        query += ' WHERE level = ?';
        params.push(level);
      }
      query += ' ORDER BY timestamp DESC LIMIT ?';
      params.push(parseInt(limit as string) || 100);
      const logs = await db.all(query, params);
      res.json({ success: true, logs });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to load logs' });
    }
  });

  app.post("/api/logs", async (req, res) => {
    try {
      const { level, message, module } = req.body || {};
      if (!level || !message) {
        return res.status(400).json({ success: false, message: 'level and message required' });
      }
      const db = await getDB();
      await db.run('INSERT INTO logs (level, message, module) VALUES (?, ?, ?)', [level, message, module || '']);
      res.json({ success: true });
    } catch (err: any) {
      res.status(500).json({ success: false, message: err?.message || 'Failed to save log' });
    }
  });

  const server = http.createServer(app);

  // Initialize WebSocket server for real-time audio & tool communication
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;

    if (pathname === "/live" || pathname === "/api/live" || pathname.endsWith("/live")) {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("Client connected to शाश्वत Live session");

    const activeProvider = getActiveProvider();
    if (!activeProvider || (!activeProvider.apiKey && activeProvider.id !== 'local')) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          code: "PROVIDER_NOT_CONFIGURED",
          message: "Gemini API is not configured. Please open AI Settings to add your key.",
        })
      );
      clientWs.close();
      return;
    }

    const apiKey = activeProvider.apiKey;

    let liveSession: any = null;
    let currentSpeakerState = getVoiceprint()
      ? { status: "LIKELY_OWNER", confidence: 0.6, ownerName: getVoiceprint()!.ownerName, message: "Awaiting audio..." }
      : { status: "UNENROLLED", confidence: 1.0, ownerName: "Guest", message: "Open mode" };

    try {
      const ai = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build",
          },
        },
      });

      // Connect to Gemini Live API with real tool declarations
      const connectWithModel = async (modelName: string) => {
        console.log(`Connecting to Gemini Live API with model: ${modelName}`);
        return await ai.live.connect({
          model: modelName,
          config: {
            responseModalities: [Modality.AUDIO],
            speechConfig: {
              voiceConfig: {
                prebuiltVoiceConfig: { voiceName: "Puck" }, // Energetic youthful voice
              },
            },
            systemInstruction: SYSTEM_INSTRUCTION,
            tools: [
              {
                functionDeclarations: TOOL_DECLARATIONS,
              },
            ],
            outputAudioTranscription: {},
            inputAudioTranscription: {},
          },
          callbacks: {
          onmessage: (message: LiveServerMessage) => {
            if (clientWs.readyState !== WebSocket.OPEN) return;

            // 1. Audio Output stream
            const serverContent = message.serverContent;
            if (serverContent?.modelTurn?.parts) {
              for (const part of serverContent.modelTurn.parts) {
                if (part.inlineData?.data) {
                  clientWs.send(
                    JSON.stringify({
                      type: "audio",
                      data: part.inlineData.data,
                    })
                  );
                }
              }
            }

            // 2. Interruption flag
            if (serverContent?.interrupted) {
              clientWs.send(JSON.stringify({ type: "interrupted" }));
            }

            // 3. Turn complete
            if (serverContent?.turnComplete) {
              clientWs.send(JSON.stringify({ type: "turnComplete" }));
            }

            // 4. Tool Call requests from model → EXECUTE ON SERVER
            const toolCall = message.toolCall;
            if (toolCall?.functionCalls) {
              // Process all tool calls from this message
              const processCalls = async () => {
                const responses: any[] = [];
                for (const fc of toolCall.functionCalls) {
                  try {
                    const { id, name, args } = fc;
                    console.log(`[Tool] ${name}`, args ? JSON.stringify(args).slice(0, 120) : "");

                    if (isClientSideTool(name)) {
                      // UI-only tools (mood, card) → forward to client for execution
                      clientWs.send(
                        JSON.stringify({
                          type: "toolCall",
                          id,
                          name,
                          args: args || {},
                        })
                      );
                      // Client will send back a toolResponse via WS; we don't respond here.
                      // But we need to send a placeholder so Gemini doesn't hang.
                      // The client's toolResponse message will be forwarded when it arrives.
                      continue;
                    }

                    // Real tools → execute server-side (gated by speaker verification)
                    const result = await executeTool(name, args || {}, currentSpeakerState);

                    // Send tool result directly to Gemini (no client round-trip)
                    responses.push({
                      id,
                      name,
                      response: result.response,
                    });

                    // Emit UI event + card to client for display
                    const evt = result.event;
                    clientWs.send(
                      JSON.stringify({
                        type: "toolEvent",
                        id,
                        toolName: name,
                        status: result.response.status === "error" ? "failed" : "success",
                        message: evt.statusLine,
                        card: evt.card,
                        timestamp: new Date().toLocaleTimeString(),
                      })
                    );
                  } catch (err: any) {
                    console.error(`[Tool] Error executing ${name}:`, err);
                    responses.push({
                      id: fc.id,
                      name: fc.name,
                      response: { status: "error", error: err?.message || "Execution failed" },
                    });
                  }
                }

                // Batch-send all real tool responses to Gemini at once
                if (responses.length > 0 && liveSession) {
                  liveSession.sendToolResponse({
                    functionResponses: responses,
                  });
                }
              };

              // Fire-and-forget: don't block the callback; process calls asynchronously
              processCalls().catch((err) => {
                console.error("[Tool] Unhandled error in processCalls:", err);
              });
            }

            // 5. Transcriptions
            const msgAny = message as any;
            if (msgAny.outputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: "transcription",
                  role: "model",
                  text: msgAny.outputTranscription.text,
                })
              );
            }
            if (msgAny.inputTranscription?.text) {
              clientWs.send(
                JSON.stringify({
                  type: "transcription",
                  role: "user",
                  text: msgAny.inputTranscription.text,
                })
              );
            }
          },
          onclose: () => {
            console.log("Gemini Live session closed");
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: "status",
                  message: "Live session disconnected",
                })
              );
            }
          },
          onerror: (error: any) => {
            console.error("Gemini Live session error:", error);
            if (clientWs.readyState === WebSocket.OPEN) {
              clientWs.send(
                JSON.stringify({
                  type: "error",
                  message: error?.message || "Live API Error",
                })
              );
            }
          },
        },
      });
      };

      try {
        liveSession = await connectWithModel("gemini-3.1-flash-live-preview");
      } catch (e1: any) {
        console.warn("Primary model gemini-3.1-flash-live-preview failed, trying gemini-2.5-flash-native-audio-latest:", e1?.message || e1);
        try {
          liveSession = await connectWithModel("gemini-2.5-flash-native-audio-latest");
        } catch (e2: any) {
          console.warn("Model gemini-2.5-flash-native-audio-latest failed, trying gemini-2.0-flash-exp:", e2?.message || e2);
          liveSession = await connectWithModel("gemini-2.0-flash-exp");
        }
      }

      clientWs.send(
        JSON.stringify({
          type: "status",
          state: "connected",
          message: "Connected to शाश्वत AI Assistant Live API",
        })
      );

      // Handle incoming WebSocket messages from client
      clientWs.on("message", (data) => {
        try {
          const msg = JSON.parse(data.toString());

          if (msg.type === "setup" && msg.tools) {
            // Client tool declarations are ignored — server owns the tool list.
          } else if (msg.type === "audio" && msg.data && liveSession) {
            // Continuously verify speaker identity on audio input
            const vResult = verifySpeaker(msg.data);
            currentSpeakerState = vResult;

            clientWs.send(
              JSON.stringify({
                type: "speaker_verification",
                result: vResult,
              })
            );

            liveSession.sendRealtimeInput({
              audio: {
                data: msg.data,
                mimeType: "audio/pcm;rate=16000",
              },
            });
          } else if (msg.type === "voice_enroll_samples" && msg.samples) {
            const result = enrollVoiceprint(msg.ownerName || "Registered Owner", msg.samples);
            clientWs.send(
              JSON.stringify({
                type: "voice_enroll_result",
                ...result,
              })
            );
          } else if (msg.type === "voice_delete") {
            const success = deleteVoiceprint();
            clientWs.send(
              JSON.stringify({
                type: "voice_delete_result",
                success,
                message: success ? "Voice profile deleted." : "Failed to delete profile.",
              })
            );
          } else if (msg.type === "voice_get_status") {
            const vp = getVoiceprint();
            clientWs.send(
              JSON.stringify({
                type: "voice_status",
                enrolled: !!vp,
                ownerName: vp?.ownerName || "Guest",
                enrolledAt: vp?.enrolledAt,
                samplesCount: vp?.samplesCount,
              })
            );
          } else if (msg.type === "text" && msg.text && liveSession) {
            liveSession.sendRealtimeInput({
              text: msg.text,
            });
          } else if ((msg.type === "image" || msg.type === "frame") && msg.data && liveSession) {
            liveSession.sendRealtimeInput({
              mediaChunks: [
                {
                  mimeType: msg.mimeType || "image/jpeg",
                  data: msg.data,
                },
              ],
            });
          } else if (msg.type === "toolResponse" && msg.id && liveSession) {
            // Client-side tool response (mood/card) → forward to Gemini
            liveSession.sendToolResponse({
              functionResponses: [
                {
                  id: msg.id,
                  name: msg.name,
                  response: msg.response || { result: "ok" },
                },
              ],
            });
          } else if (msg.type === "toolEvent") {
            // Client-emitted tool events (from client-side tool execution) → just log
            console.log("[ClientToolEvent]", msg.toolName, msg.message);
          }
        } catch (err) {
          console.error("Error processing client WS message:", err);
        }
      });

      clientWs.on("close", () => {
        console.log("Client WS closed");
        if (liveSession) {
          try {
            liveSession.close();
          } catch (_) {}
        }
      });
    } catch (error: any) {
      console.error("Failed to connect to Gemini Live:", error);
      clientWs.send(
        JSON.stringify({
          type: "error",
          message: `Failed to initialize session: ${error?.message || "Unknown error"}`,
        })
      );
      clientWs.close();
    }
  });

  // Serve compiled production frontend directly from dist/
  const currentDir = typeof __dirname !== "undefined" ? __dirname : process.cwd();
  const candidatePaths = [
    path.resolve(process.cwd(), "dist"),
    path.resolve(currentDir, "dist"),
    path.resolve(currentDir, "../dist"),
    path.resolve(process.cwd(), "resources/app/dist"),
    path.resolve(process.cwd(), "resources/app.asar/dist")
  ];
  const distPath = candidatePaths.find((p) => fs.existsSync(path.join(p, "index.html"))) || path.resolve(process.cwd(), "dist");
  console.log(`[StaticServer] Serving compiled frontend from: ${distPath}`);
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api/")) return next();
    const indexPath = path.join(distPath, "index.html");
    if (fs.existsSync(indexPath)) {
      res.sendFile(indexPath);
    } else {
      res.status(404).send("Frontend build index.html not found");
    }
  });

  // Helper to check if a healthy Shashwat AI Assistant server is ALREADY running on a given port
  const isShashwatServerRunning = async (port: number): Promise<boolean> => {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 800);
      const res = await fetch(`http://127.0.0.1:${port}/api/health`, { signal: controller.signal }).catch(() => null);
      clearTimeout(timeoutId);
      if (res && res.ok) {
        const data: any = await res.json().catch(() => ({}));
        return !!(data && (data.assistant === "शाश्वत AI Assistant" || data.status === "ok"));
      }
    } catch (_) {}
    return false;
  };

  // Helper to clear stale/orphaned processes on Windows if port is stuck
  const killStaleProcessOnPort = (port: number) => {
    if (process.platform !== "win32") return;
    try {
      const { execSync } = require("child_process");
      const output = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" }).catch(() => "");
      if (output && output.includes("LISTENING")) {
        const lines = output.split("\n");
        for (const line of lines) {
          if (line.includes("LISTENING")) {
            const parts = line.trim().split(/\s+/);
            const pid = parts[parts.length - 1];
            if (pid && pid !== "0" && pid !== process.pid.toString()) {
              console.log(`[Server] Clearing stale process on port ${port} (PID: ${pid})...`);
              execSync(`taskkill /F /PID ${pid}`);
            }
          }
        }
      }
    } catch (err: any) {
      console.warn(`[Server] Notice when clearing port ${port}:`, err?.message || err);
    }
  };

  // Resilient binding function with EADDRINUSE prevention & port fallback
  const bindServerWithFallback = async (targetPort: number): Promise<number> => {
    // 1. Check if a healthy Shashwat server is ALREADY running on targetPort
    const alreadyRunning = await isShashwatServerRunning(targetPort);
    if (alreadyRunning) {
      console.log(`[Server] Active Shashwat AI Assistant server detected on port ${targetPort}. Attaching to existing instance.`);
      (global as any).SHASHWAT_SERVER_PORT = targetPort;
      process.env.SHASHWAT_SERVER_PORT = targetPort.toString();
      return targetPort;
    }

    // 2. Try clearing any non-responsive stale process on targetPort
    killStaleProcessOnPort(targetPort);

    // 3. Attempt binding with EADDRINUSE catch + port escalation fallback
    return new Promise<number>((resolve) => {
      let currentPort = targetPort;

      const tryListen = (p: number) => {
        const onError = (err: any) => {
          server.removeListener("listening", onListening);
          if (err.code === "EADDRINUSE") {
            console.warn(`[Server] Port ${p} in use (${err.message}). Attempting next port ${p + 1}...`);
            currentPort = p + 1;
            setTimeout(() => tryListen(currentPort), 150);
          } else {
            console.error(`[Server] Critical server error on port ${p}:`, err);
            resolve(p);
          }
        };

        const onListening = () => {
          server.removeListener("error", onError);
          (global as any).SHASHWAT_SERVER_PORT = p;
          process.env.SHASHWAT_SERVER_PORT = p.toString();
          console.log(`शाश्वत AI Assistant server running on http://localhost:${p} and http://127.0.0.1:${p}`);

          runHealthChecks()
            .then((report) => {
              const { passed, failed, warned, skipped, score } = report.summary;
              const pct = Math.round(score * 100);
              console.log(`[SelfTest] ${passed} pass, ${failed} fail, ${warned} warn, ${skipped} skip — ${pct}% score`);
              for (const c of report.checks) {
                if (c.status === "warn" || c.status === "fail") {
                  console.log(`  [${c.status.toUpperCase()}] ${c.name}: ${c.detail}`);
                }
              }
            })
            .catch((err) => console.warn("[SelfTest] health checks failed:", err));

          resolve(p);
        };

        server.once("error", onError);
        server.once("listening", onListening);
        server.listen(p);
      };

      tryListen(currentPort);
    });
  };

  await bindServerWithFallback(preferredPort);

  // Graceful shutdown
  process.on('SIGINT', async () => {
    console.log('[Server] Received SIGINT, shutting down gracefully...');
    await closeDB();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('[Server] Received SIGTERM, shutting down gracefully...');
    await closeDB();
    process.exit(0);
  });
}

startServer();
