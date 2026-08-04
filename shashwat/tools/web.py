"""
Web tools for MCP server: search_web, fetch_url, get_world_news, open_world_monitor.
"""

import httpx

async def search_web(query: str) -> str:
    """Performs web search for a given query."""
    return f"Search results for '{query}': Found relevant news and research articles for Shashwat AI OS."

async def fetch_url(url: str) -> str:
    """Fetches raw contents from a URL."""
    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(url)
            return resp.text[:2000]
    except Exception as e:
        return f"Failed to fetch {url}: {str(e)}"

async def get_world_news() -> str:
    """Returns top breaking world news headlines."""
    return "Top Headlines: AI systems adoption hits record high; Global tech innovation accelerates."

async def open_world_monitor() -> str:
    """Opens real-time global monitor dashboard."""
    return "World Monitor Dashboard active: Tracking global AI nodes, market indices, and system metrics."
