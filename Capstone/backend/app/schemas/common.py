"""Pydantic schemas. Field aliases keep the camelCase shape used by the
existing frontend domain types (src/lib/domain/types.ts)."""

from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field


def camel(value: str) -> str:
    head, *rest = value.split("_")
    return head + "".join(word.capitalize() for word in rest)


class CamelModel(BaseModel):
    model_config = ConfigDict(alias_generator=camel, populate_by_name=True, from_attributes=True)


class HealthResponse(BaseModel):
    status: Literal["ok", "error"]
    database: Literal["connected", "unavailable"]
    database_version: str | None = None
    tables: list[str] = []


# --------------------------------- suppliers ---------------------------------


class SupplierIn(CamelModel):
    name: str = Field(min_length=1, max_length=160)
    contact_person: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    medicines_supplied: list[str] = []


class SupplierOut(CamelModel):
    id: str
    name: str
    contact_person: str = ""
    phone: str = ""
    email: str = ""
    address: str = ""
    medicines_supplied: list[str] = []
    order_count: int = 0
    last_order_date: date | None = None


# --------------------------------- medicines ---------------------------------


class MedicineIn(CamelModel):
    name: str = Field(min_length=1, max_length=160)
    category: str = Field(min_length=1, max_length=80)
    manufacturer: str = ""
    batch_number: str = Field(min_length=1, max_length=60)
    quantity: int = Field(ge=0)
    reorder_level: int = Field(ge=0)
    purchase_price: float = Field(ge=0)
    selling_price: float = Field(ge=0)
    manufacturing_date: date | None = None
    expiry_date: date
    storage_location: str = ""
    supplier_id: str | None = None


class MedicineOut(CamelModel):
    id: str
    name: str
    category: str
    manufacturer: str = ""
    batch_number: str
    quantity: int
    reorder_level: int
    purchase_price: float
    selling_price: float
    manufacturing_date: date | None = None
    expiry_date: date
    storage_location: str = ""
    supplier_id: str | None = None
    supplier_name: str = "Unassigned"


# ------------------------------ stock movements ------------------------------


class StockTransactionIn(CamelModel):
    medicine_id: str
    type: Literal["add", "remove", "adjust"]
    quantity: int
    reason: str = ""
    user: str = ""


class StockTransactionOut(CamelModel):
    id: str
    medicine_id: str
    medicine_name: str = ""
    type: str
    quantity: int
    reason: str = ""
    user: str = ""
    created_at: datetime


class ReorderSuggestionOut(CamelModel):
    medicine: MedicineOut
    suggested_quantity: int
    supplier_name: str


# ------------------------------ purchase orders ------------------------------


class PurchaseOrderLine(CamelModel):
    medicine_id: str
    medicine_name: str = ""
    quantity: int = Field(gt=0)
    unit_price: float = Field(ge=0)


class PurchaseOrderIn(CamelModel):
    supplier_id: str
    order_date: date
    expected_delivery: date | None = None
    status: Literal["pending", "ordered", "received", "cancelled"] | None = "pending"
    lines: list[PurchaseOrderLine] = []


class PurchaseOrderStatusIn(CamelModel):
    status: Literal["pending", "ordered", "received", "cancelled"]


class PurchaseOrderOut(CamelModel):
    id: str
    supplier_id: str
    supplier_name: str = ""
    status: str
    order_date: date
    expected_delivery: date | None = None
    lines: list[PurchaseOrderLine] = []
    total: float = 0


# ---------------------------------- expiry -----------------------------------


class ExpiryActionIn(CamelModel):
    action: Literal["none", "returned", "disposed", "review"]


class ExpiryRecordOut(CamelModel):
    medicine_id: str
    action: str
    updated_at: datetime


# ------------------------------- notifications -------------------------------


class NotificationOut(CamelModel):
    id: str
    kind: str
    title: str
    message: str = ""
    read: bool = False
    created_at: datetime


# --------------------------------- analytics ---------------------------------


class DashboardMetricsOut(CamelModel):
    total_medicines: int
    total_stock_units: int
    low_stock: int
    out_of_stock: int
    expired: int
    expiring_in30_days: int = Field(serialization_alias="expiringIn30Days")
    pending_orders: int
    inventory_value: float
    waste_units: int
    waste_value: float
    paperless_transactions: int
    inventory_optimization: int

    model_config = ConfigDict(
        alias_generator=camel, populate_by_name=True, from_attributes=True
    )


class DashboardChartsOut(CamelModel):
    stock_levels: list[dict] = []
    stock_movement: list[dict] = []
    expiry_trend: list[dict] = []
    waste_trend: list[dict] = []
    category_inventory: list[dict] = []
    purchase_trend: list[dict] = []


class GreenMetricsOut(CamelModel):
    waste_avoided_units: int
    reorders_avoided: int
    digital_transactions: int
    paperless_reports: int
    inventory_optimization: int
    storage_efficiency: int
    early_expiry_detections: int
    monthly: list[dict] = []
    paperless_trend: list[dict] = []


class ReportColumn(CamelModel):
    key: str
    label: str


class ReportResultOut(CamelModel):
    id: str
    title: str
    columns: list[ReportColumn]
    rows: list[dict]
    generated_at: datetime


# ------------------------------ authentication -------------------------------


class LoginIn(CamelModel):
    identifier: str
    password: str
    role: Literal["pharmacist", "inventory_manager", "administrator"]


class AuthUserOut(CamelModel):
    id: str
    name: str
    email: str
    role: str
    initials: str


class LoginOut(CamelModel):
    token: str
    user: AuthUserOut


class ForgotPasswordIn(CamelModel):
    email: str


class ForgotPasswordOut(CamelModel):
    sent: bool
