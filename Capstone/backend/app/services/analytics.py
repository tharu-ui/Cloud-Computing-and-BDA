"""Dashboard, green-computing and report calculations. Every number is derived
deterministically from PostgreSQL rows - no random or hardcoded values."""

from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session, selectinload

from app.models import (
    ExpiryAction,
    ExpiryRecord,
    Medicine,
    Notification,
    PurchaseOrder,
    PurchaseOrderStatus,
    StockTransaction,
    Supplier,
    TransactionType,
)
from app.services.inventory import (
    days_until,
    expiring_within,
    month_labels,
    stock_status,
    stock_value,
)


def _medicines(db: Session) -> list[Medicine]:
    return list(
        db.scalars(select(Medicine).options(selectinload(Medicine.supplier)).order_by(Medicine.name))
    )


def _orders(db: Session) -> list[PurchaseOrder]:
    return list(
        db.scalars(
            select(PurchaseOrder)
            .options(selectinload(PurchaseOrder.items), selectinload(PurchaseOrder.supplier))
            .order_by(PurchaseOrder.order_date.desc())
        )
    )


def _transactions(db: Session) -> list[StockTransaction]:
    return list(
        db.scalars(
            select(StockTransaction)
            .options(selectinload(StockTransaction.medicine))
            .order_by(StockTransaction.created_at.desc())
        )
    )


def dashboard_metrics(db: Session) -> dict:
    medicines = _medicines(db)
    orders = _orders(db)
    transaction_count = len(_transactions(db))
    statuses = [stock_status(m) for m in medicines]
    expired = [m for m in medicines if days_until(m.expiry_date) < 0]

    return {
        "total_medicines": len(medicines),
        "total_stock_units": sum(m.quantity for m in medicines),
        "low_stock": statuses.count("low_stock"),
        "out_of_stock": statuses.count("out_of_stock"),
        "expired": statuses.count("expired"),
        "expiring_in30_days": len(expiring_within(medicines, 30)),
        "pending_orders": sum(1 for o in orders if o.status == PurchaseOrderStatus.pending),
        "inventory_value": round(sum(stock_value(m) for m in medicines), 2),
        "waste_units": sum(m.quantity for m in expired),
        "waste_value": round(sum(stock_value(m) for m in expired), 2),
        "paperless_transactions": transaction_count + len(orders),
        "inventory_optimization": round(
            statuses.count("in_stock") / max(len(medicines), 1) * 100
        ),
    }


def _as_date(value) -> date:
    if isinstance(value, datetime):
        return value.date()
    return value


def dashboard_charts(db: Session) -> dict:
    medicines = _medicines(db)
    orders = _orders(db)
    transactions = _transactions(db)
    buckets = month_labels(6)

    by_category: dict[str, dict[str, float]] = {}
    for m in medicines:
        entry = by_category.setdefault(m.category, {"units": 0, "value": 0.0})
        entry["units"] += m.quantity
        entry["value"] += stock_value(m)

    stock_levels = [
        {
            "label": (m.name.split(" ")[0] or m.name),
            "quantity": m.quantity,
            "reorderLevel": m.reorder_level,
        }
        for m in sorted(medicines, key=lambda x: x.quantity, reverse=True)[:8]
    ]

    stock_movement, waste_trend, expiry_trend, purchase_trend = [], [], [], []
    today = date.today()
    for label, start, end in buckets:
        month_tx = [t for t in transactions if start <= _as_date(t.created_at) < end]
        stock_in = sum(t.quantity for t in month_tx if t.quantity > 0)
        stock_out = sum(-t.quantity for t in month_tx if t.quantity < 0)
        stock_movement.append({"label": label, "stockIn": stock_in, "stockOut": stock_out})

        wasted = [
            t
            for t in month_tx
            if t.quantity < 0
            and ("Disposed" in (t.reason or "") or "Returned" in (t.reason or ""))
        ]
        waste_units = sum(-t.quantity for t in wasted)
        waste_value = sum(
            -t.quantity * float(t.medicine.purchase_price) for t in wasted if t.medicine
        )
        waste_trend.append(
            {"label": label, "wasteUnits": waste_units, "wasteValue": round(waste_value)}
        )

        expired_items = sum(
            1 for m in medicines if m.expiry_date and start <= m.expiry_date < end and m.expiry_date < today
        )
        near_expiry = sum(
            1
            for m in medicines
            if m.expiry_date and start <= m.expiry_date < end and m.expiry_date >= today
        )
        expiry_trend.append(
            {"label": label, "expiredItems": expired_items, "nearExpiry": near_expiry}
        )

        month_orders = [o for o in orders if start <= o.order_date < end]
        purchase_trend.append(
            {
                "label": label,
                "purchaseValue": round(sum(float(o.total) for o in month_orders)),
                "orders": len(month_orders),
            }
        )

    return {
        "stock_levels": stock_levels,
        "stock_movement": stock_movement,
        "expiry_trend": expiry_trend,
        "waste_trend": waste_trend,
        "category_inventory": [
            {"label": label, "units": v["units"], "value": round(v["value"])}
            for label, v in sorted(by_category.items())
        ],
        "purchase_trend": purchase_trend,
    }


def green_metrics(db: Session) -> dict:
    medicines = _medicines(db)
    orders = _orders(db)
    transactions = _transactions(db)
    records = list(db.scalars(select(ExpiryRecord)))
    notifications = list(db.scalars(select(Notification)))
    metrics = dashboard_metrics(db)

    # Units kept out of landfill: stock returned to suppliers instead of disposed,
    # plus stock still sellable on batches flagged early for review.
    returned_units = sum(
        -t.quantity for t in transactions if t.quantity < 0 and "Returned" in (t.reason or "")
    )
    flagged_ids = {r.medicine_id for r in records if r.action == ExpiryAction.review}
    rescued_units = sum(m.quantity for m in medicines if m.id in flagged_ids)
    waste_avoided = returned_units + rescued_units

    # Consolidating several medicines into one purchase order avoids one delivery
    # trip (and one paper order form) per extra line item.
    reorders_avoided = sum(max(len(o.items) - 1, 0) for o in orders)

    non_expired_units = sum(m.quantity for m in medicines if days_until(m.expiry_date) >= 0)
    total_units = max(sum(m.quantity for m in medicines), 1)

    buckets = month_labels(6)
    monthly, paperless_trend = [], []
    for label, start, end in buckets:
        month_tx = [t for t in transactions if start <= _as_date(t.created_at) < end]
        month_orders = [o for o in orders if start <= o.order_date < end]
        monthly.append(
            {
                "label": label,
                "wasteAvoided": sum(
                    -t.quantity
                    for t in month_tx
                    if t.quantity < 0 and "Returned" in (t.reason or "")
                ),
                "reordersAvoided": sum(max(len(o.items) - 1, 0) for o in month_orders),
            }
        )
        paperless_trend.append(
            {
                "label": label,
                "digitalRecords": len(month_tx) + len(month_orders),
                "printedRecords": sum(
                    1 for o in month_orders if o.status == PurchaseOrderStatus.cancelled
                ),
            }
        )

    return {
        "waste_avoided_units": waste_avoided,
        "reorders_avoided": reorders_avoided,
        "digital_transactions": metrics["paperless_transactions"],
        "paperless_reports": len(orders) + len(records) + len(notifications),
        "inventory_optimization": metrics["inventory_optimization"],
        "storage_efficiency": round(non_expired_units / total_units * 100),
        "early_expiry_detections": len(expiring_within(medicines, 90)),
        "monthly": monthly,
        "paperless_trend": paperless_trend,
    }
