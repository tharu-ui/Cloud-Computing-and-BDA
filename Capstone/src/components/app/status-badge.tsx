import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS } from "@/lib/domain/medicine-status";
import type { PurchaseOrderStatus, StockStatus } from "@/lib/domain/types";

const STOCK_CLASSES: Record<StockStatus, string> = {
  in_stock: "bg-success/12 text-success border-success/30",
  low_stock: "bg-warning/15 text-warning-foreground border-warning/40",
  out_of_stock: "bg-muted text-muted-foreground border-border",
  expiring_soon: "bg-info/12 text-info border-info/30",
  expired: "bg-destructive/12 text-destructive border-destructive/30",
};

export function StockStatusBadge({ status }: { status: StockStatus }) {
  return (
    <Badge variant="outline" className={`font-medium ${STOCK_CLASSES[status]}`}>
      {STATUS_LABELS[status]}
    </Badge>
  );
}

const ORDER_CLASSES: Record<PurchaseOrderStatus, string> = {
  pending: "bg-warning/15 text-warning-foreground border-warning/40",
  ordered: "bg-info/12 text-info border-info/30",
  received: "bg-success/12 text-success border-success/30",
  cancelled: "bg-muted text-muted-foreground border-border",
};

const ORDER_LABELS: Record<PurchaseOrderStatus, string> = {
  pending: "Pending",
  ordered: "Ordered",
  received: "Received",
  cancelled: "Cancelled",
};

export function OrderStatusBadge({ status }: { status: PurchaseOrderStatus }) {
  return (
    <Badge variant="outline" className={`font-medium ${ORDER_CLASSES[status]}`}>
      {ORDER_LABELS[status]}
    </Badge>
  );
}