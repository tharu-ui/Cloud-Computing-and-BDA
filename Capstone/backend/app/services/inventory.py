"""Inventory rules mirrored from src/lib/domain/medicine-status.ts so the
backend and frontend agree on medicine status and stock arithmetic."""

from datetime import date, datetime, timedelta, timezone

from fastapi import HTTPException, status
from sqlalchemy import func, select
from sqlalchemy.orm import Session

from app.models import (
    ExpiryAction,
    ExpiryRecord,
    Medicine,
    PurchaseOrder,
    PurchaseOrderStatus,
    StockTransaction,
    TransactionType,
)

EXPIRY_SOON_DAYS = 30


def days_until(target: date | None, today: date | None = None) -> int:
    if target is None:
        return 10_000
    return (target - (today or date.today())).days


def stock_status(medicine: Medicine, today: date | None = None) -> str:
    days = days_until(medicine.expiry_date, today)
    if days < 0:
        return "expired"
    if medicine.quantity <= 0:
        return "out_of_stock"
    if days <= EXPIRY_SOON_DAYS:
        return "expiring_soon"
    if medicine.quantity <= medicine.reorder_level:
        return "low_stock"
    return "in_stock"


def stock_value(medicine: Medicine) -> float:
    return float(medicine.quantity) * float(medicine.purchase_price)


def next_id(db: Session, model, prefix: str, width: int = 3) -> str:
    """Deterministic, collision-free sequential id (MED-025, SUP-007, ...)."""
    count = db.scalar(select(func.count()).select_from(model)) or 0
    candidate = f"{prefix}-{str(count + 1).zfill(width)}"
    while db.get(model, candidate) is not None:
        count += 1
        candidate = f"{prefix}-{str(count + 1).zfill(width)}"
    return candidate


def apply_stock_movement(
    db: Session,
    medicine: Medicine,
    kind: TransactionType,
    quantity: int,
    reason: str = "",
    performed_by: str = "",
) -> StockTransaction:
    """Applies a signed delta to a medicine and records the movement.
    Never lets stock fall below zero."""
    if kind == TransactionType.add:
        delta = abs(quantity)
    elif kind == TransactionType.remove:
        delta = -abs(quantity)
    else:
        delta = quantity

    if medicine.quantity + delta < 0:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST, detail="Stock cannot fall below zero"
        )

    medicine.quantity += delta
    transaction = StockTransaction(
        id=next_id(db, StockTransaction, "TRX", width=4),
        medicine_id=medicine.id,
        type=kind,
        quantity=delta,
        reason=reason,
        performed_by=performed_by,
        created_at=datetime.now(timezone.utc),
    )
    db.add(transaction)
    return transaction


def receive_purchase_order(db: Session, order: PurchaseOrder, performed_by: str) -> None:
    """Increases stock for every line exactly once (idempotent by received_at)."""
    if order.received_at is not None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Purchase order has already been received",
        )
    for line in order.items:
        medicine = db.get(Medicine, line.medicine_id) if line.medicine_id else None
        if medicine is None:
            continue
        apply_stock_movement(
            db,
            medicine,
            TransactionType.add,
            line.quantity,
            reason=f"Received purchase order {order.id}",
            performed_by=performed_by or "Purchasing",
        )
    order.received_at = datetime.now(timezone.utc)
    order.status = PurchaseOrderStatus.received
    supplier = order.supplier
    if supplier is not None:
        supplier.last_order_date = order.order_date


def set_expiry_action(
    db: Session, medicine: Medicine, action: ExpiryAction, performed_by: str = "Expiry workflow"
) -> ExpiryRecord:
    record = db.scalar(select(ExpiryRecord).where(ExpiryRecord.medicine_id == medicine.id))
    if record is None:
        record = ExpiryRecord(medicine_id=medicine.id, action=action)
        db.add(record)
    record.action = action
    record.updated_at = datetime.now(timezone.utc)

    if action in (ExpiryAction.disposed, ExpiryAction.returned) and medicine.quantity > 0:
        apply_stock_movement(
            db,
            medicine,
            TransactionType.remove,
            medicine.quantity,
            reason=(
                "Disposed expired batch"
                if action == ExpiryAction.disposed
                else "Returned to supplier"
            ),
            performed_by=performed_by,
        )
    return record


def reorder_suggestions(db: Session) -> list[dict]:
    medicines = list(db.scalars(select(Medicine).order_by(Medicine.name)))
    out: list[dict] = []
    for medicine in medicines:
        if stock_status(medicine) in ("low_stock", "out_of_stock"):
            out.append(
                {
                    "medicine": medicine,
                    "suggested_quantity": max(
                        medicine.reorder_level * 2 - medicine.quantity, 20
                    ),
                    "supplier_name": medicine.supplier_name,
                }
            )
    return out


def month_labels(count: int = 6, today: date | None = None) -> list[tuple[str, date, date]]:
    """Last `count` months as (label, start, end_exclusive)."""
    today = today or date.today()
    buckets: list[tuple[str, date, date]] = []
    year, month = today.year, today.month
    starts: list[date] = []
    for _ in range(count):
        starts.append(date(year, month, 1))
        month -= 1
        if month == 0:
            month, year = 12, year - 1
    for start in reversed(starts):
        if start.month == 12:
            end = date(start.year + 1, 1, 1)
        else:
            end = date(start.year, start.month + 1, 1)
        buckets.append((start.strftime("%b"), start, end))
    return buckets


def expiring_within(medicines: list[Medicine], days: int) -> list[Medicine]:
    return [m for m in medicines if 0 <= days_until(m.expiry_date) <= days]
