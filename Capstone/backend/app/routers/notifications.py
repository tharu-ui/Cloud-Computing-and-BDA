from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Notification
from app.schemas.common import NotificationOut

router = APIRouter(prefix="/notifications", tags=["notifications"])


@router.get("", response_model=list[NotificationOut])
def list_notifications(db: Session = Depends(get_db)) -> list[Notification]:
    return list(db.scalars(select(Notification).order_by(Notification.created_at.desc())))


@router.patch("/read-all", response_model=list[NotificationOut])
def mark_all_read(db: Session = Depends(get_db)) -> list[Notification]:
    items = list(db.scalars(select(Notification).order_by(Notification.created_at.desc())))
    for item in items:
        item.read = True
    db.commit()
    return items


@router.patch("/{notification_id}/read", response_model=NotificationOut)
def mark_read(notification_id: str, db: Session = Depends(get_db)) -> Notification:
    item = db.get(Notification, notification_id)
    if item is None:
        raise HTTPException(status_code=404, detail="Notification not found")
    item.read = True
    db.commit()
    db.refresh(item)
    return item
