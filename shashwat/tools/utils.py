"""
Utility tools for MCP server: format_json, word_count.
"""

import json

async def format_json(data_str: str) -> str:
    """Pretty prints a JSON string."""
    try:
        parsed = json.loads(data_str)
        return json.dumps(parsed, indent=2)
    except Exception as e:
        return f"Invalid JSON: {str(e)}"

async def word_count(text: str) -> str:
    """Counts words and characters in text."""
    words = len(text.split())
    chars = len(text)
    return f"Words: {words} | Characters: {chars}"
