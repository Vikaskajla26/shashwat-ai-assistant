"""
Shashwat AI OS - FastMCP SSE Server Entrypoint.
Command: `uv run shashwat` or `python server.py`
Exposes MCP tools via Server-Sent Events (SSE) on port :8000.
"""

from fastmcp import FastMCP
from shashwat.config import config
from shashwat.tools.web import search_web, fetch_url, get_world_news, open_world_monitor
from shashwat.tools.system import get_current_time, get_system_info
from shashwat.tools.utils import format_json, word_count
from shashwat.prompts import PROMPTS
from shashwat.resources import RESOURCES

# Initialize FastMCP Server
mcp = FastMCP("Shashwat AI OS Server")

# Register Web Tools
mcp.tool()(search_web)
mcp.tool()(fetch_url)
mcp.tool()(get_world_news)
mcp.tool()(open_world_monitor)

# Register System Tools
mcp.tool()(get_current_time)
mcp.tool()(get_system_info)

# Register Utility Tools
mcp.tool()(format_json)
mcp.tool()(word_count)

# Register Prompt Templates
@mcp.prompt()
def summarize(text: str) -> str:
    return PROMPTS["summarize"].format(text=text)

@mcp.prompt()
def explain_code(code: str) -> str:
    return PROMPTS["explain_code"].format(code=code)

# Register Resources
@mcp.resource("shashwat://info")
def system_info_resource() -> str:
    return RESOURCES["shashwat://info"]["content"]

def main():
    print(f"🚀 Starting Shashwat FastMCP Server on {config.MCP_HOST}:{config.MCP_PORT} (SSE)...")
    mcp.run(transport="sse", host=config.MCP_HOST, port=config.MCP_PORT)

if __name__ == "__main__":
    main()
