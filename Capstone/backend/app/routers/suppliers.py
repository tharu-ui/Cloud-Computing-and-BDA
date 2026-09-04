from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Supplier
from app.schemas.common import SupplierIn, SupplierOut
from app.services.inventory import next_id

router = APIRouter(prefix="/suppliers", tags=["suppliers"])


def _get_or_404(db: Session, supplier_id: str) -> Supplier:
    supplier = db.get(Supplier, supplier_id)
    if supplier is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Supplier not found")
    return supplier


@router.get("", response_model=list[SupplierOut])
def list_suppliers(db: Session = Depends(get_db)) -> list[Supplier]:
    return list(db.scalars(select(Supplier).order_by(Supplier.name)))


@router.get("/{supplier_id}", response_model=SupplierOut)
def get_supplier(supplier_id: str, db: Session = Depends(get_db)) -> Supplier:
    return _get_or_404(db, supplier_id)


@router.post("", response_model=SupplierOut, status_code=status.HTTP_201_CREATED)
def create_supplier(payload: SupplierIn, db: Session = Depends(get_db)) -> Supplier:
    supplier = Supplier(id=next_id(db, Supplier, "SUP"), **payload.model_dump())
    db.add(supplier)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.put("/{supplier_id}", response_model=SupplierOut)
def update_supplier(
    supplier_id: str, payload: SupplierIn, db: Session = Depends(get_db)
) -> Supplier:
    supplier = _get_or_404(db, supplier_id)
    for field, value in payload.model_dump().items():
        setattr(supplier, field, value)
    db.commit()
    db.refresh(supplier)
    return supplier


@router.delete("/{supplier_id}")
def delete_supplier(supplier_id: str, db: Session = Depends(get_db)) -> dict[str, str]:
    supplier = _get_or_404(db, supplier_id)
    db.delete(supplier)
    db.commit()
    return {"id": supplier_id}
