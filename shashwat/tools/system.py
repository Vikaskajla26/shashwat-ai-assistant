"""
System tools for MCP server: get_current_time, get_system_info.
"""

import datetime
import platform
import psutil

async def get_current_time() -> str:
    """Returns current date and time."""
    now = datetime.datetime.now()
    return now.strftime("%Y-%m-%d %H:%M:%S (%A)")

async def get_system_info() -> str:
    """Returns host operating system and vitality info."""
    cpu = psutil.cpu_percent(interval=0.1)
    mem = psutil.virtual_memory()
    return f"OS: {platform.system()} {platform.release()} | CPU: {cpu}% | RAM Used: {mem.percent}% ({round(mem.used/1e9, 2)} GB / {round(mem.total/1e9, 2)} GB)"
