"""
MCP Resources module for Shashwat AI OS exposed to clients.
"""

RESOURCES = {
    "shashwat://info": {
        "name": "Shashwat System Info",
        "description": "Metadata and operational state of Shashwat AI OS",
        "mimeType": "application/json",
        "content": '{"version": "0.1.0", "status": "active", "personality": "Respectful, efficient, Boss-centric"}'
    }
}
