from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.schemas.schemas import InboundEmailWebhook
from app.services.inbound_email_service import InboundEmailService

router = APIRouter()

@router.post("/webhook", status_code=status.HTTP_200_OK)
async def inbound_email_webhook(payload: InboundEmailWebhook, db: Session = Depends(get_db)):
    """
    Ingests inbound emails, extracts ticket ID (e.g. [TKT-2026-000001]),
    appends messages to tickets, and notifies agents in real-time.
    """
    result = await InboundEmailService.process_incoming_email(
        db=db,
        sender_email=payload.sender_email,
        sender_name=payload.sender_name or "Customer",
        subject=payload.subject,
        body=payload.body,
        message_id=payload.message_id
    )
    return result
