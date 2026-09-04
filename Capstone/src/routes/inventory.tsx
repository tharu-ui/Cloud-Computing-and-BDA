import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { ArrowUpDown, Package, Pencil, Plus, Search, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/app/data-states";
import { MedicineFormDialog } from "@/components/app/medicine-form-dialog";
import { PageHeader } from "@/components/app/page-header";
import { StockStatusBadge } from "@/components/app/status-badge";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
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
  createMedicine,
  deleteMedicine,
  getMedicines,
  getSuppliers,
  updateMedicine,
} from "@/lib/api/services";
import { CATEGORIES } from "@/lib/data/sample-data";
import {
  formatCurrency,
  formatDate,
  getStockStatus,
  STATUS_LABELS,
  stockValue,
} from "@/lib/domain/medicine-status";
import type { Medicine, MedicineInput, StockStatus } from "@/lib/domain/types";

export const Route = createFileRoute("/inventory")({
  head: () => ({
    meta: [
      { title: "Medicine Inventory — GreenPharm" },
      {
        name: "description",
        content:
          "Search, filter and manage every medicine batch with quantity, pricing, supplier, storage location and expiry details.",
      },
      { property: "og:title", content: "Medicine Inventory — GreenPharm" },
      {
        property: "og:description",
        content: "Batch-level medicine records with live stock status.",
      },
    ],
  }),
  component: InventoryPage,
});

type SortKey = "name" | "quantity" | "expiryDate" | "category";

function InventoryPage() {
  const queryClient = useQueryClient();
  const medicinesQuery = useQuery({ queryKey: ["medicines"], queryFn: getMedicines });
  const suppliersQuery = useQuery({ queryKey: ["suppliers"], queryFn: getSuppliers });

  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("all");
  const [status, setStatus] = useState<"all" | StockStatus>("all");
  const [sortKey, setSortKey] = useState<SortKey>("name");
  const [sortAsc, setSortAsc] = useState(true);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Medicine | null>(null);
  const [details, setDetails] = useState<Medicine | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Medicine | null>(null);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["medicines"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
  };

  const saveMutation = useMutation({
    mutationFn: (input: MedicineInput) =>
      editing ? updateMedicine(editing.id, input) : createMedicine(input),
    onSuccess: (medicine) => {
      invalidate();
      setFormOpen(false);
      setEditing(null);
      toast.success(`${medicine.name} saved`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string) => deleteMedicine(id),
    onSuccess: () => {
      invalidate();
      toast.success("Medicine removed");
      setPendingDelete(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const rows = useMemo(() => {
    const list = (medicinesQuery.data ?? []).filter((m) => {
      const term = search.trim().toLowerCase();
      const matchesTerm =
        !term ||
        m.name.toLowerCase().includes(term) ||
        m.id.toLowerCase().includes(term) ||
        m.batchNumber.toLowerCase().includes(term) ||
        m.manufacturer.toLowerCase().includes(term);
      const matchesCategory = category === "all" || m.category === category;
      const matchesStatus = status === "all" || getStockStatus(m) === status;
      return matchesTerm && matchesCategory && matchesStatus;
    });

    return list.sort((a, b) => {
      const dir = sortAsc ? 1 : -1;
      if (sortKey === "quantity") return (a.quantity - b.quantity) * dir;
      return String(a[sortKey]).localeCompare(String(b[sortKey])) * dir;
    });
  }, [medicinesQuery.data, search, category, status, sortKey, sortAsc]);

  function toggleSort(key: SortKey) {
    if (key === sortKey) setSortAsc((v) => !v);
    else {
      setSortKey(key);
      setSortAsc(true);
    }
  }

  return (
    <AppShell>
      <PageHeader
        title="Medicine inventory"
        description={`${medicinesQuery.data?.length ?? 0} batch records `}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden /> Add medicine
          </Button>
        }
      />

      <Card className="gap-0 border-border/70 p-4 shadow-none">
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <div className="relative">
            <Search
              className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
              aria-hidden
            />
            <Input
              aria-label="Search medicines"
              placeholder="Search name, ID, batch, maker"
              className="pl-9"
              value={search}
              maxLength={80}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger aria-label="Filter by category">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={status} onValueChange={(v) => setStatus(v as "all" | StockStatus)}>
            <SelectTrigger aria-label="Filter by stock status">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              {(Object.keys(STATUS_LABELS) as StockStatus[]).map((s) => (
                <SelectItem key={s} value={s}>
                  {STATUS_LABELS[s]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={sortKey} onValueChange={(v) => setSortKey(v as SortKey)}>
            <SelectTrigger aria-label="Sort by">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="name">Sort: name</SelectItem>
              <SelectItem value="quantity">Sort: quantity</SelectItem>
              <SelectItem value="expiryDate">Sort: expiry date</SelectItem>
              <SelectItem value="category">Sort: category</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </Card>

      {medicinesQuery.isPending ? (
        <LoadingBlock rows={8} />
      ) : medicinesQuery.isError ? (
        <ErrorBlock onRetry={() => medicinesQuery.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyBlock
          icon={Package}
          title="No medicines match these filters"
          description="Adjust the search or filters, or add a new medicine batch."
          action={
            <Button
              variant="outline"
              onClick={() => {
                setSearch("");
                setCategory("all");
                setStatus("all");
              }}
            >
              Clear filters
            </Button>
          }
        />
      ) : (
        <Card className="overflow-hidden border-border/70 p-0 shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("name")}
                    >
                      Medicine <ArrowUpDown className="size-3.5" aria-hidden />
                    </button>
                  </TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead className="text-right">
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("quantity")}
                    >
                      Qty <ArrowUpDown className="size-3.5" aria-hidden />
                    </button>
                  </TableHead>
                  <TableHead className="text-right">Value</TableHead>
                  <TableHead>
                    <button
                      className="inline-flex items-center gap-1"
                      onClick={() => toggleSort("expiryDate")}
                    >
                      Expiry <ArrowUpDown className="size-3.5" aria-hidden />
                    </button>
                  </TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => (
                  <TableRow key={m.id}>
                    <TableCell>
                      <button
                        className="text-left font-medium text-foreground hover:text-primary hover:underline"
                        onClick={() => setDetails(m)}
                      >
                        {m.name}
                      </button>
                      <p className="text-xs text-muted-foreground">
                        {m.id} · {m.manufacturer}
                      </p>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">{m.category}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {m.batchNumber}
                    </TableCell>
                    <TableCell className="text-right text-sm font-medium">
                      {m.quantity.toLocaleString()}
                      <span className="block text-xs font-normal text-muted-foreground">
                        RL {m.reorderLevel}
                      </span>
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {formatCurrency(stockValue(m))}
                    </TableCell>
                    <TableCell className="text-sm">{formatDate(m.expiryDate)}</TableCell>
                    <TableCell>
                      <StockStatusBadge status={getStockStatus(m)} />
                    </TableCell>
                    <TableCell className="text-right whitespace-nowrap">
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Edit ${m.name}`}
                        onClick={() => {
                          setEditing(m);
                          setFormOpen(true);
                        }}
                      >
                        <Pencil className="size-4" aria-hidden />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`Delete ${m.name}`}
                        className="text-destructive hover:text-destructive"
                        onClick={() => setPendingDelete(m)}
                      >
                        <Trash2 className="size-4" aria-hidden />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      <MedicineFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
        medicine={editing}
        suppliers={suppliersQuery.data ?? []}
        submitting={saveMutation.isPending}
        onSubmit={(input) => saveMutation.mutate(input)}
      />

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{details?.name}</DialogTitle>
          </DialogHeader>
          {details ? (
            <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
              {[
                ["Medicine ID", details.id],
                ["Category", details.category],
                ["Manufacturer", details.manufacturer],
                ["Batch number", details.batchNumber],
                ["Quantity", details.quantity.toLocaleString()],
                ["Reorder level", String(details.reorderLevel)],
                ["Purchase price", `$${details.purchasePrice.toFixed(2)}`],
                ["Selling price", `$${details.sellingPrice.toFixed(2)}`],
                ["Manufactured", formatDate(details.manufacturingDate)],
                ["Expiry", formatDate(details.expiryDate)],
                ["Supplier", details.supplierName],
                ["Storage location", details.storageLocation],
                ["Stock value", formatCurrency(stockValue(details))],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs tracking-wide text-muted-foreground uppercase">
                    {label}
                  </dt>
                  <dd className="mt-0.5 font-medium text-foreground">{value}</dd>
                </div>
              ))}
              <div>
                <dt className="text-xs tracking-wide text-muted-foreground uppercase">Status</dt>
                <dd className="mt-1">
                  <StockStatusBadge status={getStockStatus(details)} />
                </dd>
              </div>
            </dl>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog
        open={!!pendingDelete}
        onOpenChange={(open) => !open && setPendingDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              This removes the batch record and its stock from the inventory. This action cannot
              be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              Delete medicine
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}