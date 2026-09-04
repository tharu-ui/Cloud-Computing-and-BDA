import enum


class UserRole(str, enum.Enum):
    pharmacist = "pharmacist"
    inventory_manager = "inventory_manager"
    administrator = "administrator"


class TransactionType(str, enum.Enum):
    add = "add"
    remove = "remove"
    adjust = "adjust"


class PurchaseOrderStatus(str, enum.Enum):
    pending = "pending"
    ordered = "ordered"
    received = "received"
    cancelled = "cancelled"


class ExpiryAction(str, enum.Enum):
    none = "none"
    returned = "returned"
    disposed = "disposed"
    review = "review"


class NotificationKind(str, enum.Enum):
    low_stock = "low_stock"
    expiring = "expiring"
    expired = "expired"
    pending_order = "pending_order"
    unusual_stock = "unusual_stock"