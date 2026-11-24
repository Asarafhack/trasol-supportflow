import json
import logging
from typing import Dict, List, Set, Any
from fastapi import WebSocket

logger = logging.getLogger("WebSocketManager")

class ConnectionManager:
    def __init__(self):
        # Map user_id -> List of active WebSockets
        self.user_connections: Dict[str, List[WebSocket]] = {}
        # Map ticket_id -> List of active WebSockets subscribed to ticket chat
        self.ticket_rooms: Dict[str, List[WebSocket]] = {}
        # Track online user IDs
        self.online_users: Set[str] = set()

    async def connect_user(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        if user_id not in self.user_connections:
            self.user_connections[user_id] = []
        self.user_connections[user_id].append(websocket)
        self.online_users.add(user_id)
        logger.info(f"User {user_id} connected. Active connections: {len(self.user_connections[user_id])}")

    def disconnect_user(self, websocket: WebSocket, user_id: str):
        if user_id in self.user_connections:
            if websocket in self.user_connections[user_id]:
                self.user_connections[user_id].remove(websocket)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
                self.online_users.discard(user_id)
        logger.info(f"User {user_id} disconnected.")

    async def connect_ticket(self, websocket: WebSocket, ticket_id: str):
        await websocket.accept()
        if ticket_id not in self.ticket_rooms:
            self.ticket_rooms[ticket_id] = []
        self.ticket_rooms[ticket_id].append(websocket)
        logger.info(f"Subscribed to ticket room {ticket_id}")

    def disconnect_ticket(self, websocket: WebSocket, ticket_id: str):
        if ticket_id in self.ticket_rooms:
            if websocket in self.ticket_rooms[ticket_id]:
                self.ticket_rooms[ticket_id].remove(websocket)
            if not self.ticket_rooms[ticket_id]:
                del self.ticket_rooms[ticket_id]

    async def send_to_user(self, user_id: str, data: Dict[str, Any]):
        if user_id in self.user_connections:
            dead_sockets = []
            for ws in self.user_connections[user_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead_sockets.append(ws)
            for ws in dead_sockets:
                self.disconnect_user(ws, user_id)

    async def broadcast_to_ticket(self, ticket_id: str, data: Dict[str, Any]):
        if ticket_id in self.ticket_rooms:
            dead_sockets = []
            for ws in self.ticket_rooms[ticket_id]:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead_sockets.append(ws)
            for ws in dead_sockets:
                self.disconnect_ticket(ws, ticket_id)

    async def broadcast_event(self, data: Dict[str, Any], target_roles: List[str] = None):
        """Broadcasts event across all connected users or filtered by role."""
        for user_id, sockets in list(self.user_connections.items()):
            dead_sockets = []
            for ws in sockets:
                try:
                    await ws.send_json(data)
                except Exception:
                    dead_sockets.append(ws)
            for ws in dead_sockets:
                self.disconnect_user(ws, user_id)

ws_manager = ConnectionManager()
