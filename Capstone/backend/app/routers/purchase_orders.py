from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import (
    Medicine,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    Supplier,
)
from app.schemas.common import PurchaseOrderIn, PurchaseOrderOut, PurchaseOrderStatusIn
from app.services.inventory import next_id, receive_purchase_order

router = APIRouter(prefix="/purchase-orders", tags=["purchase-orders"])


def _to_dto(order: PurchaseOrder) -> dict:
    return {
        "id": order.id,
        "supplier_id": order.supplier_id,
        "supplier_name": order.supplier.name if order.supplier else "",
        "status": order.status.value,
        "order_date": order.order_date,
        "expected_delivery": order.expected_delivery,
        "total": round(float(order.total), 2),
        "lines": [
            {
                "medicine_id": item.medicine_id or "",
                "medicine_name": item.medicine_name,
                "quantity": item.quantity,
                "unit_price": round(float(item.unit_price), 2),
            }
            for item in order.items
        ],
    }


def _get_or_404(db: Session, order_id: str) -> PurchaseOrder:
    order = db.get(PurchaseOrder, order_id)
    if order is None:
        raise HTTPException(status_code=404, detail="Purchase order not found")
    return order


@router.get("", response_model=list[PurchaseOrderOut])
def list_orders(db: Session = Depends(get_db)) -> list[dict]:
    orders = db.scalars(
        select(PurchaseOrder)
        .options(selectinload(PurchaseOrder.items), selectinload(PurchaseOrder.supplier))
        .order_by(PurchaseOrder.order_date.desc())
    )
    return [_to_dto(o) for o in orders]


@router.get("/{order_id}", response_model=PurchaseOrderOut)
def get_order(order_id: str, db: Session = Depends(get_db)) -> dict:
    return _to_dto(_get_or_404(db, order_id))


@router.post("", response_model=PurchaseOrderOut, status_code=status.HTTP_201_CREATED)
def create_order(payload: PurchaseOrderIn, db: Session = Depends(get_db)) -> dict:
    supplier = db.get(Supplier, payload.supplier_id)
    if supplier is None:
        raise HTTPException(status_code=404, detail="Supplier not found")
    if not payload.lines:
        raise HTTPException(status_code=400, detail="Add at least one medicine")

    order = PurchaseOrder(
        id=next_id(db, PurchaseOrder, "PO", width=4),
        supplier_id=supplier.id,
        status=PurchaseOrderStatus(payload.status or "pending"),
        order_date=payload.order_date,
        expected_delivery=payload.expected_delivery,
        total=round(sum(l.quantity * l.unit_price for l in payload.lines), 2),
    )
    for line in payload.lines:
        medicine = db.get(Medicine, line.medicine_id) if line.medicine_id else None
        order.items.append(
            PurchaseOrderItem(
                medicine_id=medicine.id if medicine else None,
                medicine_name=line.medicine_name or (medicine.name if medicine else "Unknown"),
                quantity=line.quantity,
                unit_price=line.unit_price,
            )
        )
    supplier.order_count = (supplier.order_count or 0) + 1
    supplier.last_order_date = payload.order_date
    db.add(order)
    db.commit()
    db.refresh(order)
    if order.status == PurchaseOrderStatus.received:
        receive_purchase_order(db, order, performed_by="Purchasing")
        db.commit()
        db.refresh(order)
    return _to_dto(order)


@router.patch("/{order_id}/status", response_model=PurchaseOrderOut)
def update_status(
    order_id: str, payload: PurchaseOrderStatusIn, db: Session = Depends(get_db)
) -> dict:
    order = _get_or_404(db, order_id)
    new_status = PurchaseOrderStatus(payload.status)
    if new_status == PurchaseOrderStatus.received:
        receive_purchase_order(db, order, performed_by="Purchasing")
    else:
        order.status = new_status
    db.commit()
    db.refresh(order)
    return _to_dto(order)
