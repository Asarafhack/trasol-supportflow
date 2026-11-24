from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import or_, desc

from app.api.deps import get_db, get_current_user
from app.models.entities import Notification, User
from app.schemas.schemas import NotificationOut

router = APIRouter()

@router.get("", response_model=List[NotificationOut])
async def get_my_notifications(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    query = db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.role_target == current_user.role,
            Notification.role_target == "all"
        )
    ).order_by(desc(Notification.created_at)).limit(50)
    return query.all()

@router.put("/{notification_id}/read", response_model=NotificationOut)
async def mark_notification_read(
    notification_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    notif = db.query(Notification).filter(Notification.id == notification_id).first()
    if not notif:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Notification not found.")

    notif.is_read = True
    db.commit()
    db.refresh(notif)
    return notif

@router.put("/read-all")
async def mark_all_notifications_read(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    db.query(Notification).filter(
        or_(
            Notification.user_id == current_user.id,
            Notification.role_target == current_user.role
        )
    ).update({"is_read": True})
    db.commit()
    return {"message": "All notifications marked as read."}
