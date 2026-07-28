import dotenv from "dotenv";
import express from "express";
import http from "http";
import path from "path";

dotenv.config();
dotenv.config({ path: ".env.local" });
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI } from "@google/genai";
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

async function startServer() {
  const app = express();
  const PORT = 3000;
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
    const { REGISTERED_COMMANDS } = require("./server/docIntel/commandProcessor");
    res.json({ success: true, commands: REGISTERED_COMMANDS });
  });

  app.post("/api/study/command", async (req, res) => {
    try {
      const { command, docId } = req.body || {};
      const { processStudyCommand } = require("./server/docIntel/commandProcessor");
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

  const server = http.createServer(app);

  // Initialize WebSocket server for real-time audio & tool communication
  const wss = new WebSocketServer({ noServer: true });

  server.on("upgrade", (request, socket, head) => {
    const pathname = new URL(request.url || "", `http://${request.headers.host}`).pathname;

    if (pathname === "/live") {
      wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit("connection", ws, request);
      });
    } else {
      socket.destroy();
    }
  });

  wss.on("connection", async (clientWs: WebSocket) => {
    console.log("Client connected to शाश्वत Live session");

    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      clientWs.send(
        JSON.stringify({
          type: "error",
          message: "GEMINI_API_KEY environment variable is missing on server.",
        })
      );
      clientWs.close();
      return;
    }

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
  const distPath = path.resolve(process.cwd(), "dist");
  console.log("[StaticServer] Serving compiled frontend from dist/");
  app.use(express.static(distPath));
  app.get("*", (req, res, next) => {
    if (req.originalUrl.startsWith("/api/")) return next();
    res.sendFile(path.join(distPath, "index.html"));
  });

  server.listen(PORT, () => {
    console.log(`शाश्वत AI Assistant server running on http://localhost:${PORT} and http://127.0.0.1:${PORT}`);

    // Fire-and-forget startup self-test. Never blocks boot; results appear in
    // GET /api/health/detailed and are logged to the console.
    runHealthChecks()
      .then((report) => {
        const { passed, failed, warned, skipped, score } = report.summary;
        const pct = Math.round(score * 100);
        console.log(
          `[SelfTest] ${passed} pass, ${failed} fail, ${warned} warn, ${skipped} skip — ${pct}% score`
        );
        // Log individual warnings/failures for quick diagnosis.
        for (const c of report.checks) {
          if (c.status === "warn" || c.status === "fail") {
            console.log(`  [${c.status.toUpperCase()}] ${c.name}: ${c.detail}`);
          }
        }
      })
      .catch((err) => console.warn("[SelfTest] health checks failed:", err));
  });
}

startServer();
