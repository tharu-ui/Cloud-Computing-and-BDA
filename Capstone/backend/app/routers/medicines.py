from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Medicine, Supplier
from app.schemas.common import MedicineIn, MedicineOut
from app.services.inventory import next_id

router = APIRouter(tags=["medicines"])


def _get_or_404(db: Session, medicine_id: str) -> Medicine:
    medicine = db.get(Medicine, medicine_id)
    if medicine is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Medicine not found")
    return medicine


@router.get("/medicines", response_model=list[MedicineOut])
def list_medicines(db: Session = Depends(get_db)) -> list[Medicine]:
    return list(
        db.scalars(
            select(Medicine).options(selectinload(Medicine.supplier)).order_by(Medicine.name)
        )
    )


@router.get("/medicines/{medicine_id}", response_model=MedicineOut)
def get_medicine(medicine_id: str, db: Session = Depends(get_db)) -> Medicine:
    return _get_or_404(db, medicine_id)


@router.post("/medicines", response_model=MedicineOut, status_code=status.HTTP_201_CREATED)
def create_medicine(payload: MedicineIn, db: Session = Depends(get_db)) -> Medicine:
    if payload.supplier_id and db.get(Supplier, payload.supplier_id) is None:
        raise HTTPException(status_code=400, detail="Supplier not found")
    medicine = Medicine(id=next_id(db, Medicine, "MED"), **payload.model_dump())
    db.add(medicine)
    db.commit()
    db.refresh(medicine)
    return medicine


@router.put("/medicines/{medicine_id}", response_model=MedicineOut)
def update_medicine(
    medicine_id: str, payload: MedicineIn, db: Session = Depends(get_db)
) -> Medicine:
    medicine = _get_or_404(db, medicine_id)
    if payload.supplier_id and db.get(Supplier, payload.supplier_id) is None:
        raise HTTPException(status_code=400, detail="Supplier not found")
    for field, value in payload.model_dump().items():
        setattr(medicine, field, value)
    db.commit()
    db.refresh(medicine)
    return medicine


@router.delete("/medicines/{medicine_id}")
def delete_medicine(medicine_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    medicine = _get_or_404(db, medicine_id)
    db.delete(medicine)
    db.commit()
    return {"id": medicine_id}


@router.get("/categories", response_model=list[str])
def list_categories(db: Session = Depends(get_db)) -> list[str]:
    return sorted({c for c in db.scalars(select(Medicine.category).distinct()) if c})
