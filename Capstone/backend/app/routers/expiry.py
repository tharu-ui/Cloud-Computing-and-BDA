from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import ExpiryAction, ExpiryRecord, Medicine
from app.schemas.common import ExpiryActionIn, ExpiryRecordOut
from app.services.inventory import set_expiry_action

router = APIRouter(prefix="/expiry-records", tags=["expiry"])


@router.get("", response_model=list[ExpiryRecordOut])
def list_records(db: Session = Depends(get_db)) -> list[ExpiryRecord]:
    return list(db.scalars(select(ExpiryRecord).order_by(ExpiryRecord.updated_at.desc())))


@router.put("/{medicine_id}", response_model=ExpiryRecordOut)
def upsert_record(
    medicine_id: str, payload: ExpiryActionIn, db: Session = Depends(get_db)
) -> ExpiryRecord:
    medicine = db.get(Medicine, medicine_id)
    if medicine is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    record = set_expiry_action(db, medicine, ExpiryAction(payload.action))
    db.commit()
    db.refresh(record)
    return record
