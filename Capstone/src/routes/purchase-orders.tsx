import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { ClipboardList, Plus } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/app/data-states";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createPurchaseOrder,
  getMedicines,
  getPurchaseOrders,
  getSuppliers,
  updatePurchaseOrderStatus,
} from "@/lib/api/services";
import { formatCurrency, formatDate } from "@/lib/domain/medicine-status";
import type { PurchaseOrder, PurchaseOrderStatus } from "@/lib/domain/types";

export const Route = createFileRoute("/purchase-orders")({
  head: () => ({
    meta: [
      { title: "Purchase Orders — GreenPharm" },
      {
        name: "description",
        content:
          "Create purchase orders, track supplier deliveries and move orders through pending, ordered, received and cancelled states.",
      },
      { property: "og:title", content: "Purchase Orders — GreenPharm" },
      { property: "og:description", content: "Paperless purchase order tracking." },
    ],
  }),
  component: PurchaseOrdersPage,
});

const STATUSES: PurchaseOrderStatus[] = ["pending", "ordered", "received", "cancelled"];

function statusVariant(status: PurchaseOrderStatus) {
  if (status === "received") return "secondary" as const;
  if (status === "cancelled") return "destructive" as const;
  return "outline" as const;
}

function PurchaseOrdersPage() {
  const queryClient = useQueryClient();
  const orders = useQuery({ queryKey: ["purchase-orders"], queryFn: getPurchaseOrders });
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: getSuppliers });
  const medicines = useQuery({ queryKey: ["medicines"], queryFn: getMedicines });

  const [filter, setFilter] = useState<"all" | PurchaseOrderStatus>("all");
  const [createOpen, setCreateOpen] = useState(false);
  const [details, setDetails] = useState<PurchaseOrder | null>(null);
  const [supplierId, setSupplierId] = useState("");
  const [medicineId, setMedicineId] = useState("");
  const [quantity, setQuantity] = useState(50);
  const [expectedDelivery, setExpectedDelivery] = useState("");

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["purchase-orders"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["notifications"] });
  };

  const createMutation = useMutation({
    mutationFn: createPurchaseOrder,
    onSuccess: (order) => {
      invalidate();
      toast.success(`${order.id} created`);
      setCreateOpen(false);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string; status: PurchaseOrderStatus }) =>
      updatePurchaseOrderStatus(id, status),
    onSuccess: (order) => {
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      toast.success(`${order.id} marked ${order.status}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = (orders.data ?? []).filter((o) => filter === "all" || o.status === filter);

  function submit(event: React.FormEvent) {
    event.preventDefault();
    const medicine = medicines.data?.find((m) => m.id === medicineId);
    if (!supplierId || !medicine) {
      toast.error("Select a supplier and a medicine");
      return;
    }
    if (quantity < 1) {
      toast.error("Quantity must be at least 1");
      return;
    }
    createMutation.mutate({
      supplierId,
      orderDate: new Date().toISOString(),
      expectedDelivery: expectedDelivery || new Date(Date.now() + 6048e5).toISOString(),
      lines: [
        {
          medicineId: medicine.id,
          medicineName: medicine.name,
          quantity,
          unitPrice: medicine.purchasePrice,
        },
      ],
    });
  }

  return (
    <AppShell>
      <PageHeader
        title="Purchase orders"
        description="Track ordered quantities, suppliers and expected deliveries."
        actions={
          <Button onClick={() => setCreateOpen(true)}>
            <Plus className="size-4" aria-hidden /> Create order
          </Button>
        }
      />

      <div className="flex flex-wrap gap-2">
        {(["all", ...STATUSES] as const).map((s) => (
          <Button
            key={s}
            size="sm"
            variant={filter === s ? "default" : "outline"}
            className="capitalize"
            onClick={() => setFilter(s)}
          >
            {s}
          </Button>
        ))}
      </div>

      {orders.isPending ? (
        <LoadingBlock rows={5} />
      ) : orders.isError ? (
        <ErrorBlock onRetry={() => orders.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyBlock icon={ClipboardList} title="No purchase orders in this view" />
      ) : (
        <Card className="overflow-hidden border-border/70 p-0 shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Supplier</TableHead>
                  <TableHead>Ordered</TableHead>
                  <TableHead>Expected</TableHead>
                  <TableHead className="text-right">Items</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((o) => (
                  <TableRow key={o.id}>
                    <TableCell className="text-sm font-medium">{o.id}</TableCell>
                    <TableCell className="text-sm">{o.supplierName}</TableCell>
                    <TableCell className="text-sm">{formatDate(o.orderDate)}</TableCell>
                    <TableCell className="text-sm">{formatDate(o.expectedDelivery)}</TableCell>
                    <TableCell className="text-right text-sm">{o.lines.length}</TableCell>
                    <TableCell className="text-right text-sm">{formatCurrency(o.total)}</TableCell>
                    <TableCell>
                      <Badge variant={statusVariant(o.status)} className="capitalize">
                        {o.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button size="sm" variant="outline" onClick={() => setDetails(o)}>
                          Details
                        </Button>
                        <Select
                          value={o.status}
                          onValueChange={(v) =>
                            statusMutation.mutate({ id: o.id, status: v as PurchaseOrderStatus })
                          }
                        >
                          <SelectTrigger className="w-[130px] capitalize" aria-label="Status">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {STATUSES.map((s) => (
                              <SelectItem key={s} value={s} className="capitalize">
                                {s}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create purchase order</DialogTitle>
            <DialogDescription>
              Receiving an order adds its quantities back into stock.
            </DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="po-supplier">Supplier</Label>
              <Select value={supplierId} onValueChange={setSupplierId}>
                <SelectTrigger id="po-supplier" className="w-full">
                  <SelectValue placeholder="Select supplier" />
                </SelectTrigger>
                <SelectContent>
                  {(suppliers.data ?? []).map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="po-medicine">Medicine</Label>
              <Select value={medicineId} onValueChange={setMedicineId}>
                <SelectTrigger id="po-medicine" className="w-full">
                  <SelectValue placeholder="Select medicine" />
                </SelectTrigger>
                <SelectContent>
                  {(medicines.data ?? []).map((m) => (
                    <SelectItem key={m.id} value={m.id}>
                      {m.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="po-qty">Quantity</Label>
                <Input
                  id="po-qty"
                  type="number"
                  min={1}
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="po-date">Expected delivery</Label>
                <Input
                  id="po-date"
                  type="date"
                  value={expectedDelivery.slice(0, 10)}
                  onChange={(e) =>
                    setExpectedDelivery(
                      e.target.value ? new Date(e.target.value).toISOString() : "",
                    )
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={createMutation.isPending}>
                Create order
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!details} onOpenChange={(o) => !o && setDetails(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{details?.id}</DialogTitle>
            <DialogDescription>
              {details?.supplierName} · expected {details ? formatDate(details.expectedDelivery) : ""}
            </DialogDescription>
          </DialogHeader>
          <ul className="divide-y divide-border text-sm">
            {(details?.lines ?? []).map((l) => (
              <li key={l.medicineId} className="flex items-center justify-between gap-3 py-2">
                <span className="min-w-0 truncate">
                  {l.medicineName} × {l.quantity}
                </span>
                <span className="shrink-0 font-medium">
                  {formatCurrency(l.quantity * l.unitPrice)}
                </span>
              </li>
            ))}
          </ul>
        </DialogContent>
      </Dialog>
    </AppShell>
  );
}