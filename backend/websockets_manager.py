from fastapi import WebSocket
from typing import Dict, List
import json

class ConnectionManager:
    def __init__(self):
        # Maps user_id -> WebSocket
        self.active_connections: Dict[int, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: int):
        await websocket.accept()
        self.active_connections[user_id] = websocket
        # Send current online users to the newly connected user
        online_users = list(self.active_connections.keys())
        await websocket.send_text(json.dumps({"type": "INITIAL_STATUS", "online_users": online_users}))
        # Notify others this user is online
        await self.broadcast({"type": "STATUS", "user_id": user_id, "status": "online"})

    def disconnect(self, user_id: int):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def broadcast(self, message: dict):
        for connection in list(self.active_connections.values()):
            try:
                await connection.send_text(json.dumps(message))
            except:
                pass

    async def send_personal_message(self, message: dict, user_id: int):
        if user_id in self.active_connections:
            try:
                await self.active_connections[user_id].send_text(json.dumps(message))
            except:
                pass
                
    def get_online_users(self):
        return list(self.active_connections.keys())

manager = ConnectionManager()
