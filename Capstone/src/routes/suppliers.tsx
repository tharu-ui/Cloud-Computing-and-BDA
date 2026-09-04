import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Pencil, Plus, Search, Trash2, Truck } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/app/data-states";
import { PageHeader } from "@/components/app/page-header";
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
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
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
import { Textarea } from "@/components/ui/textarea";
import {
  createSupplier,
  deleteSupplier,
  getPurchaseOrders,
  getSuppliers,
  updateSupplier,
} from "@/lib/api/services";
import { formatCurrency, formatDate } from "@/lib/domain/medicine-status";
import type { Supplier, SupplierInput } from "@/lib/domain/types";

export const Route = createFileRoute("/suppliers")({
  head: () => ({
    meta: [
      { title: "Suppliers — GreenPharm" },
      {
        name: "description",
        content:
          "Manage pharmacy suppliers, contacts, supplied medicines and order history in one directory.",
      },
      { property: "og:title", content: "Suppliers — GreenPharm" },
      { property: "og:description", content: "Supplier directory with order history." },
    ],
  }),
  component: SuppliersPage,
});

const emptyForm: SupplierInput = {
  name: "",
  contactPerson: "",
  phone: "",
  email: "",
  address: "",
  medicinesSupplied: [],
};

function SuppliersPage() {
  const queryClient = useQueryClient();
  const suppliers = useQuery({ queryKey: ["suppliers"], queryFn: getSuppliers });
  const orders = useQuery({ queryKey: ["purchase-orders"], queryFn: getPurchaseOrders });

  const [search, setSearch] = useState("");
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Supplier | null>(null);
  const [form, setForm] = useState<SupplierInput>(emptyForm);
  const [medicinesText, setMedicinesText] = useState("");
  const [details, setDetails] = useState<Supplier | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Supplier | null>(null);

  useEffect(() => {
    if (!formOpen) return;
    if (editing) {
      const { id: _id, orderCount: _c, lastOrderDate: _d, ...rest } = editing;
      setForm(rest);
      setMedicinesText(editing.medicinesSupplied.join(", "));
    } else {
      setForm(emptyForm);
      setMedicinesText("");
    }
  }, [formOpen, editing]);

  const saveMutation = useMutation({
    mutationFn: (input: SupplierInput) =>
      editing ? updateSupplier(editing.id, input) : createSupplier(input),
    onSuccess: (supplier) => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success(`${supplier.name} saved`);
      setFormOpen(false);
      setEditing(null);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const deleteMutation = useMutation({
    mutationFn: deleteSupplier,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["suppliers"] });
      toast.success("Supplier removed");
      setPendingDelete(null);
    },
  });

  const rows = (suppliers.data ?? []).filter((s) => {
    const term = search.trim().toLowerCase();
    return (
      !term ||
      s.name.toLowerCase().includes(term) ||
      s.contactPerson.toLowerCase().includes(term) ||
      s.email.toLowerCase().includes(term)
    );
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 2) {
      toast.error("Supplier name is required");
      return;
    }
    if (!form.email.includes("@")) {
      toast.error("Enter a valid email address");
      return;
    }
    saveMutation.mutate({
      ...form,
      name: form.name.trim(),
      medicinesSupplied: medicinesText
        .split(",")
        .map((m) => m.trim())
        .filter(Boolean),
    });
  }

  const supplierOrders = (id: string) => (orders.data ?? []).filter((o) => o.supplierId === id);

  return (
    <AppShell>
      <PageHeader
        title="Suppliers"
        description={`${suppliers.data?.length ?? 0} suppliers`}
        actions={
          <Button
            onClick={() => {
              setEditing(null);
              setFormOpen(true);
            }}
          >
            <Plus className="size-4" aria-hidden /> Add supplier
          </Button>
        }
      />

      <div className="relative max-w-sm">
        <Search
          className="absolute top-1/2 left-3 size-4 -translate-y-1/2 text-muted-foreground"
          aria-hidden
        />
        <Input
          aria-label="Search suppliers"
          className="pl-9"
          placeholder="Search supplier, contact or email"
          value={search}
          maxLength={80}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {suppliers.isPending ? (
        <LoadingBlock rows={4} />
      ) : suppliers.isError ? (
        <ErrorBlock onRetry={() => suppliers.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyBlock icon={Truck} title="No suppliers match your search" />
      ) : (
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {rows.map((s) => (
            <Card key={s.id} className="border-border/70 shadow-none">
              <CardContent className="space-y-3">
                <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-2">
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-foreground">{s.name}</p>
                    <p className="truncate text-xs text-muted-foreground">
                      {s.id} · {s.contactPerson}
                    </p>
                  </div>
                  <Badge variant="secondary" className="shrink-0">
                    {s.orderCount} orders
                  </Badge>
                </div>
                <div className="space-y-1 text-sm text-muted-foreground">
                  <p className="truncate">{s.phone}</p>
                  <p className="truncate">{s.email}</p>
                  <p className="line-clamp-2">{s.address}</p>
                  <p className="text-xs">Last order {formatDate(s.lastOrderDate)}</p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => setDetails(s)}>
                    Details
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Edit ${s.name}`}
                    onClick={() => {
                      setEditing(s);
                      setFormOpen(true);
                    }}
                  >
                    <Pencil className="size-4" aria-hidden />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    aria-label={`Delete ${s.name}`}
                    className="text-destructive hover:text-destructive"
                    onClick={() => setPendingDelete(s)}
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditing(null);
        }}
      >
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit supplier" : "Add supplier"}</DialogTitle>
            <DialogDescription>Contact details are used for purchase orders.</DialogDescription>
          </DialogHeader>
          <form className="space-y-3" onSubmit={submit} noValidate>
            {(
              [
                ["name", "Supplier name"],
                ["contactPerson", "Contact person"],
                ["phone", "Phone"],
                ["email", "Email"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-1.5">
                <Label htmlFor={`sup-${key}`}>{label}</Label>
                <Input
                  id={`sup-${key}`}
                  value={form[key]}
                  maxLength={120}
                  onChange={(e) => setForm((prev) => ({ ...prev, [key]: e.target.value }))}
                />
              </div>
            ))}
            <div className="space-y-1.5">
              <Label htmlFor="sup-address">Address</Label>
              <Textarea
                id="sup-address"
                rows={2}
                maxLength={200}
                value={form.address}
                onChange={(e) => setForm((prev) => ({ ...prev, address: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="sup-medicines">Medicines supplied (comma separated)</Label>
              <Textarea
                id="sup-medicines"
                rows={2}
                maxLength={300}
                value={medicinesText}
                onChange={(e) => setMedicinesText(e.target.value)}
              />
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setFormOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={saveMutation.isPending}>
                Save supplier
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{details?.name}</DialogTitle>
            <DialogDescription>{details?.address}</DialogDescription>
          </DialogHeader>
          {details ? (
            <div className="space-y-4 text-sm">
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Medicines supplied
                </p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {details.medicinesSupplied.map((m) => (
                    <Badge key={m} variant="secondary">
                      {m}
                    </Badge>
                  ))}
                </div>
              </div>
              <div>
                <p className="text-xs tracking-wide text-muted-foreground uppercase">
                  Order history
                </p>
                <ul className="mt-2 divide-y divide-border">
                  {supplierOrders(details.id).length === 0 ? (
                    <li className="py-2 text-muted-foreground">No orders recorded.</li>
                  ) : (
                    supplierOrders(details.id).map((o) => (
                      <li key={o.id} className="flex items-center justify-between gap-3 py-2">
                        <span>
                          {o.id} · {formatDate(o.orderDate)}
                        </span>
                        <span className="font-medium">{formatCurrency(o.total)}</span>
                      </li>
                    ))
                  )}
                </ul>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>

      <AlertDialog open={!!pendingDelete} onOpenChange={(o) => !o && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete {pendingDelete?.name}?</AlertDialogTitle>
            <AlertDialogDescription>
              Medicines linked to this supplier keep their records but lose the supplier link.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              onClick={() => pendingDelete && deleteMutation.mutate(pendingDelete.id)}
            >
              Delete supplier
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </AppShell>
  );
}