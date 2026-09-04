"""Report generation from PostgreSQL data. Report ids and column shapes match
REPORT_OPTIONS in src/lib/api/analytics.ts so the existing UI keeps working."""

from datetime import date, datetime, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models import Supplier
from app.services.analytics import _as_date, _medicines, _orders, _transactions
from app.services.inventory import days_until, stock_value

REPORT_IDS = (
    "current_inventory",
    "low_stock",
    "expired",
    "near_expiry",
    "stock_movement",
    "purchase",
    "supplier",
    "waste",
    # aliases used by the documented endpoint names
    "inventory",
    "stock",
    "expiry",
    "purchases",
)

ALIASES = {
    "inventory": "current_inventory",
    "stock": "stock_movement",
    "expiry": "expired",
    "purchases": "purchase",
}


def _in_range(value: date, date_from: str | None, date_to: str | None) -> bool:
    if date_from and value < date.fromisoformat(date_from):
        return False
    if date_to and value > date.fromisoformat(date_to):
        return False
    return True


def build_report(
    db: Session,
    report_id: str,
    date_from: str | None = None,
    date_to: str | None = None,
    category: str | None = None,
) -> dict:
    report_id = ALIASES.get(report_id, report_id)
    generated_at = datetime.now(timezone.utc)
    medicines = [
        m
        for m in _medicines(db)
        if not category or category == "all" or m.category == category
    ]

    def result(title: str, columns: list[tuple[str, str]], rows: list[dict]) -> dict:
        return {
            "id": report_id,
            "title": title,
            "columns": [{"key": k, "label": l} for k, l in columns],
            "rows": rows,
            "generated_at": generated_at,
        }

    if report_id == "low_stock":
        return result(
            "Low stock report",
            [
                ("id", "ID"),
                ("name", "Medicine"),
                ("quantity", "Qty"),
                ("reorderLevel", "Reorder level"),
                ("supplierName", "Supplier"),
            ],
            [
                {
                    "id": m.id,
                    "name": m.name,
                    "quantity": m.quantity,
                    "reorderLevel": m.reorder_level,
                    "supplierName": m.supplier_name,
                }
                for m in medicines
                if m.quantity <= m.reorder_level
            ],
        )

    if report_id in ("expired", "waste"):
        return result(
            "Expired medicine report"
            if report_id == "expired"
            else "Medicine waste report (estimated)",
            [
                ("id", "ID"),
                ("name", "Medicine"),
                ("batchNumber", "Batch"),
                ("expiryDate", "Expiry"),
                ("quantity", "Units"),
                ("value", "Est. value"),
            ],
            [
                {
                    "id": m.id,
                    "name": m.name,
                    "batchNumber": m.batch_number,
                    "expiryDate": m.expiry_date.isoformat(),
                    "quantity": m.quantity,
                    "value": round(stock_value(m), 2),
                }
                for m in medicines
                if days_until(m.expiry_date) < 0
            ],
        )

    if report_id == "near_expiry":
        return result(
            "Near-expiry report (next 90 days)",
            [
                ("id", "ID"),
                ("name", "Medicine"),
                ("expiryDate", "Expiry"),
                ("daysLeft", "Days left"),
                ("quantity", "Units"),
            ],
            [
                {
                    "id": m.id,
                    "name": m.name,
                    "expiryDate": m.expiry_date.isoformat(),
                    "daysLeft": days_until(m.expiry_date),
                    "quantity": m.quantity,
                }
                for m in medicines
                if 0 <= days_until(m.expiry_date) <= 90
            ],
        )

    if report_id == "stock_movement":
        return result(
            "Stock movement report",
            [
                ("id", "Transaction"),
                ("medicineName", "Medicine"),
                ("type", "Type"),
                ("quantity", "Qty"),
                ("createdAt", "Date"),
                ("user", "User"),
            ],
            [
                {
                    "id": t.id,
                    "medicineName": t.medicine_name,
                    "type": t.type.value,
                    "quantity": t.quantity,
                    "createdAt": _as_date(t.created_at).isoformat(),
                    "user": t.user,
                }
                for t in _transactions(db)
                if _in_range(_as_date(t.created_at), date_from, date_to)
            ],
        )

    if report_id == "purchase":
        return result(
            "Purchase report",
            [
                ("id", "Order"),
                ("supplierName", "Supplier"),
                ("status", "Status"),
                ("orderDate", "Ordered"),
                ("items", "Items"),
                ("total", "Total"),
            ],
            [
                {
                    "id": o.id,
                    "supplierName": o.supplier.name if o.supplier else "",
                    "status": o.status.value,
                    "orderDate": o.order_date.isoformat(),
                    "items": len(o.items),
                    "total": round(float(o.total), 2),
                }
                for o in _orders(db)
                if _in_range(o.order_date, date_from, date_to)
            ],
        )

    if report_id == "supplier":
        return result(
            "Supplier report",
            [
                ("id", "ID"),
                ("name", "Supplier"),
                ("contactPerson", "Contact"),
                ("phone", "Phone"),
                ("orderCount", "Orders"),
                ("lastOrderDate", "Last order"),
            ],
            [
                {
                    "id": s.id,
                    "name": s.name,
                    "contactPerson": s.contact_person,
                    "phone": s.phone,
                    "orderCount": s.order_count,
                    "lastOrderDate": s.last_order_date.isoformat()
                    if s.last_order_date
                    else "",
                }
                for s in db.scalars(select(Supplier).order_by(Supplier.name))
            ],
        )

    return result(
        "Current inventory report",
        [
            ("id", "ID"),
            ("name", "Medicine"),
            ("category", "Category"),
            ("quantity", "Qty"),
            ("expiryDate", "Expiry"),
            ("value", "Stock value"),
        ],
        [
            {
                "id": m.id,
                "name": m.name,
                "category": m.category,
                "quantity": m.quantity,
                "expiryDate": m.expiry_date.isoformat(),
                "value": round(stock_value(m), 2),
            }
            for m in medicines
        ],
    )
