import json
import logging
from typing import Optional
from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Query, status
from sqlalchemy.orm import Session

from app.core.database import SessionLocal
from app.core.security import decode_token
from app.models.entities import User, Ticket
from app.websockets.manager import ws_manager

logger = logging.getLogger("WebSocketRouter")
router = APIRouter()

def get_ws_user(token: Optional[str], db: Session) -> Optional[User]:
    if not token:
        return None
    payload = decode_token(token)
    if not payload:
        return None
    user_id = payload.get("sub")
    if not user_id:
        return None
    return db.query(User).filter(User.id == user_id, User.is_active == True).first()

@router.websocket("/notifications")
async def websocket_notifications(websocket: WebSocket, token: Optional[str] = Query(None)):
    db = SessionLocal()
    try:
        user = get_ws_user(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await ws_manager.connect_user(websocket, user.id)
        # Send initial connection ack
        await websocket.send_json({
            "type": "CONNECTION_ACK",
            "user_id": user.id,
            "role": user.role
        })

        while True:
            data = await websocket.receive_text()
            try:
                msg = json.loads(data)
                # Handle ping/pong heartbeat
                if msg.get("type") == "PING":
                    await websocket.send_json({"type": "PONG"})
            except Exception:
                pass
    except WebSocketDisconnect:
        if user:
            ws_manager.disconnect_user(websocket, user.id)
    finally:
        db.close()

@router.websocket("/tickets/{ticket_id}")
async def websocket_ticket_chat(websocket: WebSocket, ticket_id: str, token: Optional[str] = Query(None)):
    db = SessionLocal()
    try:
        user = get_ws_user(token, db)
        if not user:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        # Validate ticket access permissions
        ticket = db.query(Ticket).filter(Ticket.id == ticket_id).first()
        if not ticket:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        if user.role == "customer" and ticket.customer_id != user.id:
            await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
            return

        await ws_manager.connect_ticket(websocket, ticket_id)
        await websocket.send_json({
            "type": "TICKET_ROOM_JOINED",
            "ticket_id": ticket_id,
            "user_name": user.full_name
        })

        while True:
            data = await websocket.receive_text()
            try:
                event = json.loads(data)
                event_type = event.get("type")
                
                # Typing indicator
                if event_type == "TYPING":
                    await ws_manager.broadcast_to_ticket(ticket_id, {
                        "type": "USER_TYPING",
                        "user_id": user.id,
                        "user_name": user.full_name,
                        "is_typing": event.get("is_typing", True)
                    })
                elif event_type == "PING":
                    await websocket.send_json({"type": "PONG"})
            except Exception:
                pass
    except WebSocketDisconnect:
        ws_manager.disconnect_ticket(websocket, ticket_id)
    finally:
        db.close()
