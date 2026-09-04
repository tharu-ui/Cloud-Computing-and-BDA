import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
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
import { CATEGORIES } from "@/lib/data/sample-data";
import type { Medicine, MedicineInput, Supplier } from "@/lib/domain/types";

const empty: MedicineInput = {
  name: "",
  category: CATEGORIES[0]!,
  manufacturer: "",
  batchNumber: "",
  quantity: 0,
  reorderLevel: 0,
  purchasePrice: 0,
  sellingPrice: 0,
  manufacturingDate: new Date().toISOString().slice(0, 10),
  expiryDate: new Date(Date.now() + 365 * 86_400_000).toISOString().slice(0, 10),
  supplierId: "",
  storageLocation: "",
};

export function MedicineFormDialog({
  open,
  onOpenChange,
  medicine,
  suppliers,
  submitting,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  medicine?: Medicine | null;
  suppliers: Supplier[];
  submitting: boolean;
  onSubmit: (input: MedicineInput) => void;
}) {
  const [form, setForm] = useState<MedicineInput>(empty);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setError(null);
    if (medicine) {
      const { id: _id, supplierName: _s, ...rest } = medicine;
      setForm(rest);
    } else {
      setForm({ ...empty, supplierId: suppliers[0]?.id ?? "" });
    }
  }, [open, medicine, suppliers]);

  function set<K extends keyof MedicineInput>(key: K, value: MedicineInput[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (form.name.trim().length < 2) return setError("Medicine name is required");
    if (!form.batchNumber.trim()) return setError("Batch number is required");
    if (!form.supplierId) return setError("Select a supplier");
    if (form.expiryDate <= form.manufacturingDate)
      return setError("Expiry date must be after the manufacturing date");
    setError(null);
    onSubmit({ ...form, name: form.name.trim(), batchNumber: form.batchNumber.trim() });
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>{medicine ? "Edit medicine" : "Add medicine"}</DialogTitle>
          <DialogDescription>
            Batch-level record. Stock status is derived from quantity, reorder level and expiry.
          </DialogDescription>
        </DialogHeader>

        <form className="grid gap-4 sm:grid-cols-2" onSubmit={submit} noValidate>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="m-name">Medicine name</Label>
            <Input
              id="m-name"
              value={form.name}
              maxLength={120}
              onChange={(e) => set("name", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-category">Category</Label>
            <Select value={form.category} onValueChange={(v) => set("category", v)}>
              <SelectTrigger id="m-category" className="w-full">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CATEGORIES.map((c) => (
                  <SelectItem key={c} value={c}>
                    {c}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-manufacturer">Manufacturer</Label>
            <Input
              id="m-manufacturer"
              value={form.manufacturer}
              maxLength={90}
              onChange={(e) => set("manufacturer", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-batch">Batch number</Label>
            <Input
              id="m-batch"
              value={form.batchNumber}
              maxLength={40}
              onChange={(e) => set("batchNumber", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-supplier">Supplier</Label>
            <Select value={form.supplierId} onValueChange={(v) => set("supplierId", v)}>
              <SelectTrigger id="m-supplier" className="w-full">
                <SelectValue placeholder="Select supplier" />
              </SelectTrigger>
              <SelectContent>
                {suppliers.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-qty">Quantity</Label>
            <Input
              id="m-qty"
              type="number"
              min={0}
              value={form.quantity}
              onChange={(e) => set("quantity", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-reorder">Reorder level</Label>
            <Input
              id="m-reorder"
              type="number"
              min={0}
              value={form.reorderLevel}
              onChange={(e) => set("reorderLevel", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-purchase">Purchase price</Label>
            <Input
              id="m-purchase"
              type="number"
              min={0}
              step="0.01"
              value={form.purchasePrice}
              onChange={(e) => set("purchasePrice", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-selling">Selling price</Label>
            <Input
              id="m-selling"
              type="number"
              min={0}
              step="0.01"
              value={form.sellingPrice}
              onChange={(e) => set("sellingPrice", Number(e.target.value))}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-mfg">Manufacturing date</Label>
            <Input
              id="m-mfg"
              type="date"
              value={form.manufacturingDate}
              onChange={(e) => set("manufacturingDate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="m-exp">Expiry date</Label>
            <Input
              id="m-exp"
              type="date"
              value={form.expiryDate}
              onChange={(e) => set("expiryDate", e.target.value)}
            />
          </div>
          <div className="space-y-1.5 sm:col-span-2">
            <Label htmlFor="m-location">Storage location</Label>
            <Input
              id="m-location"
              value={form.storageLocation}
              maxLength={40}
              placeholder="e.g. A1-S2 or C1-COLD"
              onChange={(e) => set("storageLocation", e.target.value)}
            />
          </div>

          {error ? (
            <p role="alert" className="text-sm font-medium text-destructive sm:col-span-2">
              {error}
            </p>
          ) : null}

          <DialogFooter className="sm:col-span-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button type="submit" disabled={submitting}>
              {medicine ? "Save changes" : "Add medicine"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}