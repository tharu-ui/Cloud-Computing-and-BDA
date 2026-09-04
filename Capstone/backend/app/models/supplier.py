from datetime import date, datetime

from sqlalchemy import ARRAY, Date, DateTime, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base


class Supplier(Base):
    __tablename__ = "suppliers"

    id: Mapped[str] = mapped_column(String(32), primary_key=True)
    name: Mapped[str] = mapped_column(String(160), nullable=False, index=True)
    contact_person: Mapped[str] = mapped_column(String(120), default="")
    phone: Mapped[str] = mapped_column(String(40), default="")
    email: Mapped[str] = mapped_column(String(180), default="")
    address: Mapped[str] = mapped_column(Text, default="")
    medicines_supplied: Mapped[list[str]] = mapped_column(
        ARRAY(String(160)), default=list, nullable=False
    )
    order_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    last_order_date: Mapped[date | None] = mapped_column(Date)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), nullable=False
    )

    medicines = relationship("Medicine", back_populates="supplier")
    purchase_orders = relationship("PurchaseOrder", back_populates="supplier")