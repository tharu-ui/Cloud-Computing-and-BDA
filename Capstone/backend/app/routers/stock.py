from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.database import get_db
from app.models import Medicine, StockTransaction, TransactionType
from app.schemas.common import ReorderSuggestionOut, StockTransactionIn, StockTransactionOut
from app.services.inventory import apply_stock_movement, reorder_suggestions

router = APIRouter(tags=["stock"])


@router.get("/stock-transactions", response_model=list[StockTransactionOut])
def list_transactions(
    medicineId: str | None = Query(default=None),
    db: Session = Depends(get_db),
) -> list[StockTransaction]:
    statement = (
        select(StockTransaction)
        .options(selectinload(StockTransaction.medicine))
        .order_by(StockTransaction.created_at.desc())
    )
    if medicineId:
        statement = statement.where(StockTransaction.medicine_id == medicineId)
    return list(db.scalars(statement))


@router.post(
    "/stock-transactions",
    response_model=StockTransactionOut,
    status_code=status.HTTP_201_CREATED,
)
def create_transaction(
    payload: StockTransactionIn, db: Session = Depends(get_db)
) -> StockTransaction:
    medicine = db.get(Medicine, payload.medicine_id)
    if medicine is None:
        raise HTTPException(status_code=404, detail="Medicine not found")
    if payload.quantity == 0:
        raise HTTPException(status_code=400, detail="Quantity must not be zero")
    transaction = apply_stock_movement(
        db,
        medicine,
        TransactionType(payload.type),
        payload.quantity,
        reason=payload.reason,
        performed_by=payload.user,
    )
    db.commit()
    db.refresh(transaction)
    return transaction


@router.get("/stock/reorder-suggestions", response_model=list[ReorderSuggestionOut])
def suggestions(db: Session = Depends(get_db)) -> list[dict]:
    return reorder_suggestions(db)
