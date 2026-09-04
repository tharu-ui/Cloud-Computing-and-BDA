from datetime import datetime

from sqlalchemy import DateTime, Enum, ForeignKey, Integer, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.database import Base
from app.models.enums import ExpiryAction


class ExpiryRecord(Base):
    __tablename__ = "expiry_records"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    medicine_id: Mapped[str] = mapped_column(
        ForeignKey("medicines.id", ondelete="CASCADE"), nullable=False, unique=True, index=True
    )
    action: Mapped[ExpiryAction] = mapped_column(
        Enum(ExpiryAction, name="expiry_action"), default=ExpiryAction.none, nullable=False
    )
    note: Mapped[str | None] = mapped_column(String(255))
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False
    )

    medicine = relationship("Medicine", back_populates="expiry_records")