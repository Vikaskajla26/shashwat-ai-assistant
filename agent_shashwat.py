"""
Shashwat AI OS - LiveKit Voice Agent.
Command: `uv run shashwat_voice` or `python agent_shashwat.py dev`

Pipeline Architecture:
Microphone ──► STT (Sarvam Saaras v3)
                   │
                   ▼
            LLM (Gemini 2.5 Flash) ◄──────► MCP Server (FastMCP / SSE on :8000)
                   │                              ├─ get_world_news
                   ▼                              ├─ open_world_monitor
            TTS (OpenAI nova)                     ├─ search_web
                   │                              └─ …more tools
                   ▼
            Speaker / LiveKit room
"""

import asyncio
import logging
from livekit.agents import AutoSubscribe, JobContext, WorkerOptions, cli, llm
from livekit.agents.pipeline import VoicePipelineAgent
from livekit.plugins import gemini, openai, sarvam

from shashwat.config import config

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("shashwat-agent")

SYSTEM_INSTRUCTION = """You are Shashwat (शाश्वत), an advanced AI desktop operating system voice assistant.
- ALWAYS address the user as "Boss" (e.g., "Yes, Boss.", "Opening YouTube, Boss.", "Jo hukum, Boss.").
- For OS actions, app launches, and PC controls, you may naturally use "Jo hukum, Boss." or "Done, Boss."
- Be concise, efficient, cheerful, empathetic, and ultra-responsive.
- Execute tools seamlessly whenever requested.
"""

async def entrypoint(ctx: JobContext):
    logger.info("⚡ Connecting to LiveKit room for Shashwat AI OS...")
    await ctx.connect(auto_subscribe=AutoSubscribe.AUDIO_ONLY)

    # 1. STT: Sarvam Saaras v3
    stt = sarvam.STT(
        api_key=config.SARVAM_API_KEY,
        model="saaras:v3",
        language_code="hi-IN"
    )

    # 2. LLM: Gemini 2.5 Flash with FastMCP Server integration
    llm_instance = gemini.LLM(
        api_key=config.GEMINI_API_KEY,
        model="gemini-2.5-flash",
    )

    # 3. TTS: OpenAI nova
    tts = openai.TTS(
        api_key=config.OPENAI_API_KEY,
        voice="nova",
    )

    # Construct Voice Pipeline Agent
    agent = VoicePipelineAgent(
        vad=openai.VAD.load(),
        stt=stt,
        llm=llm_instance,
        tts=tts,
        chat_ctx=llm.ChatContext().append(
            role="system",
            text=SYSTEM_INSTRUCTION,
        ),
    )

    logger.info("🎤 Shashwat Voice Pipeline Active. Listening for Boss...")
    agent.start(ctx.room)
    await agent.say("Namaste Boss, Shashwat AI OS is online and ready for your command.", allow_interruptions=True)

def main():
    cli.run_app(WorkerOptions(entrypoint_fnc=entrypoint))

if __name__ == "__main__":
    main()
