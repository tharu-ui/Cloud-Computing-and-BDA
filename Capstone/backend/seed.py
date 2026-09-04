"""Seed the GreenPharm database from the frontend  dataset.

The dataset is exported from src/lib/data/sample-data.ts to seed_data.json:

    bun backend/tools/export-sample-data.ts      # regenerate (optional)
    python seed.py                               # idempotent seed

Running the seed twice does not create duplicates: rows are upserted by
primary key. Pass --reset to truncate the tables first.
"""

from __future__ import annotations

import argparse
import json
from datetime import date, datetime
from pathlib import Path

from sqlalchemy import text

from app.database import Base, SessionLocal, engine
from app.models import (
    ExpiryAction,
    ExpiryRecord,
    Medicine,
    Notification,
    NotificationKind,
    PurchaseOrder,
    PurchaseOrderItem,
    PurchaseOrderStatus,
    StockTransaction,
    Supplier,
    TransactionType,
    User,
    UserRole,
)
from app.config import get_settings
from app.services.security import hash_password

DATA_FILE = Path(__file__).with_name("seed_data.json")

TABLES = [
    "purchase_order_items",
    "purchase_orders",
    "stock_transactions",
    "expiry_records",
    "notifications",
    "medicines",
    "suppliers",
    "users",
]


def as_date(value: str | None) -> date | None:
    if not value:
        return None
    return date.fromisoformat(value[:10])


def as_datetime(value: str | None) -> datetime | None:
    if not value:
        return None
    return datetime.fromisoformat(value.replace("Z", "+00:00"))


def seed(reset: bool = False) -> None:
    Base.metadata.create_all(bind=engine)
    data = json.loads(DATA_FILE.read_text())
    settings = get_settings()

    with SessionLocal() as db:
        if reset:
            db.execute(text(f"TRUNCATE {', '.join(TABLES)} RESTART IDENTITY CASCADE"))
            db.commit()

        for row in data["users"]:
            user = db.get(User, row["id"])
            if user is None:
                user = User(id=row["id"])
                db.add(user)
            user.name = row["name"]
            user.email = row["email"]
            user.initials = row["initials"]
            user.role = UserRole(row["role"])
            if not user.password_hash:
                user.password_hash = hash_password(settings.demo_password)

        for row in data["suppliers"]:
            supplier = db.get(Supplier, row["id"])
            if supplier is None:
                supplier = Supplier(id=row["id"])
                db.add(supplier)
            supplier.name = row["name"]
            supplier.contact_person = row["contactPerson"]
            supplier.phone = row["phone"]
            supplier.email = row["email"]
            supplier.address = row["address"]
            supplier.medicines_supplied = row["medicinesSupplied"]
            supplier.order_count = row["orderCount"]
            supplier.last_order_date = as_date(row["lastOrderDate"])
        db.flush()

        for row in data["medicines"]:
            medicine = db.get(Medicine, row["id"])
            if medicine is None:
                medicine = Medicine(id=row["id"])
                db.add(medicine)
            medicine.name = row["name"]
            medicine.category = row["category"]
            medicine.manufacturer = row["manufacturer"]
            medicine.batch_number = row["batchNumber"]
            medicine.quantity = row["quantity"]
            medicine.reorder_level = row["reorderLevel"]
            medicine.purchase_price = row["purchasePrice"]
            medicine.selling_price = row["sellingPrice"]
            medicine.manufacturing_date = as_date(row.get("manufacturingDate"))
            medicine.expiry_date = as_date(row["expiryDate"])
            medicine.storage_location = row["storageLocation"]
            medicine.supplier_id = row["supplierId"] or None
        db.flush()

        for row in data["stockTransactions"]:
            transaction = db.get(StockTransaction, row["id"])
            if transaction is None:
                transaction = StockTransaction(id=row["id"])
                db.add(transaction)
            transaction.medicine_id = row["medicineId"]
            transaction.type = TransactionType(row["type"])
            transaction.quantity = row["quantity"]
            transaction.reason = row["reason"]
            transaction.performed_by = row["user"]
            transaction.created_at = as_datetime(row["createdAt"])

        for row in data["purchaseOrders"]:
            order = db.get(PurchaseOrder, row["id"])
            if order is None:
                order = PurchaseOrder(id=row["id"])
                db.add(order)
            order.supplier_id = row["supplierId"]
            order.status = PurchaseOrderStatus(row["status"])
            order.order_date = as_date(row["orderDate"])
            order.expected_delivery = as_date(row.get("expectedDelivery"))
            order.total = row["total"]
            # Seeded "received" orders already reflect their stock in the seeded
            # quantities, so mark them received to block a second stock increase.
            if order.status == PurchaseOrderStatus.received and order.received_at is None:
                order.received_at = as_datetime(row["orderDate"] + "T00:00:00+00:00")
            order.items.clear()
            db.flush()
            for line in row["lines"]:
                order.items.append(
                    PurchaseOrderItem(
                        medicine_id=line["medicineId"] or None,
                        medicine_name=line["medicineName"],
                        quantity=line["quantity"],
                        unit_price=line["unitPrice"],
                    )
                )

        existing_records = {r.medicine_id: r for r in db.query(ExpiryRecord).all()}
        for row in data["expiryRecords"]:
            record = existing_records.get(row["medicineId"])
            if record is None:
                record = ExpiryRecord(medicine_id=row["medicineId"])
                db.add(record)
            record.action = ExpiryAction(row["action"])
            record.updated_at = as_datetime(row["updatedAt"])

        for row in data["notifications"]:
            notification = db.get(Notification, row["id"])
            if notification is None:
                notification = Notification(id=row["id"])
                db.add(notification)
            notification.kind = NotificationKind(row["kind"])
            notification.title = row["title"]
            notification.message = row["message"]
            notification.read = row["read"]
            notification.created_at = as_datetime(row["createdAt"])

        db.commit()

        counts = {table: db.execute(text(f"select count(*) from {table}")).scalar() for table in TABLES}
        print("seeded:", counts)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Seed the GreenPharm database")
    parser.add_argument("--reset", action="store_true", help="truncate tables first")
    seed(reset=parser.parse_args().reset)
