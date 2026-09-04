from datetime import date, datetime

from sqlalchemy import Date, DateTime, ForeignKey, Integer, Numeric, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Medicine(Base):
    __tablename__ = "medicines"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    category: Mapped[str] = mapped_column(String(80), nullable=False, index=True)
    manufacturer: Mapped[str] = mapped_column(String(160), default="")
    batch_number: Mapped[str] = mapped_column(String(60), nullable=False)
    quantity: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    reorder_level: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    purchase_price: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    selling_price: Mapped[float] = mapped_column(Numeric(10, 2), default=0, nullable=False)
    manufacturing_date: Mapped[date | None] = mapped_column(Date)
    expiry_date: Mapped[date] = mapped_column(Date, nullable=False, index=True)
    storage_location: Mapped[str] = mapped_column(String(80), default="")
    supplier_id: Mapped[str | None] = mapped_column(
        ForeignKey("suppliers.id", ondelete="SET NULL"), index=True
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    supplier = relationship("Supplier", back_populates="medicines")
    transactions = relationship(
        "StockTransaction", back_populates="medicine", cascade="all, delete-orphan"
    )
    expiry_records = relationship(
        "ExpiryRecord", back_populates="medicine", cascade="all, delete-orphan"
    )

    @property
    def supplier_name(self) -> str:
        return self.supplier.name if self.supplier else "Unassigned"