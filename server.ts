import dotenv from "dotenv";
import express from "express";
import http from "http";
import path from "path";

dotenv.config();
dotenv.config({ path: ".env.local" });
import { WebSocketServer, WebSocket } from "ws";
import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { createServer as createViteServer } from "vite";
import { TOOL_DECLARATIONS } from "./server/tools/declarations";
import { executeTool, isClientSideTool } from "./server/tools";
import { SYSTEM_INSTRUCTION } from "./server/systemInstruction";

async function startServer() {
  const app = express();
  const PORT = 3000;
  const HOST = "0.0.0.0";

  app.use(express.json());

  // Health check endpoint
  app.get("/api/health", (_req, res) => {
    res.json({
      status: "ok",
      assistant: "शाश्वत AI Assistant",
      model: "gemini-3.1-flash-live-preview",
      time: new Date().toISOString(),
    });
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

                    // Real tools → execute server-side
                    const result = await executeTool(name, args || {});

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
            liveSession.sendRealtimeInput({
              audio: {
                data: msg.data,
                mimeType: "audio/pcm;rate=16000",
              },
            });
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

  // Serve frontend assets or mount Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: {
        middlewareMode: true,
        watch: {
          ignored: ["**/bin/**", "**/data/**"],
        },
      },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  server.listen(PORT, HOST, () => {
    console.log(`शाश्वत AI Assistant server running on http://${HOST}:${PORT}`);
  });
}

startServer();
