import { db, nextId } from "../data/store";
import { CATEGORIES } from "../data/sample-data";
import { ApiError, request } from "./client";
import { getStockStatus } from "../domain/medicine-status";
import type {
  AppNotification,
  ExpiryAction,
  ExpiryRecord,
  Medicine,
  MedicineInput,
  PurchaseOrder,
  PurchaseOrderInput,
  PurchaseOrderStatus,
  StockTransaction,
  StockTransactionInput,
  Supplier,
  SupplierInput,
} from "../domain/types";

/* ------------------------------- medicines ------------------------------- */

export function getMedicines(): Promise<Medicine[]> {
  return request("/medicines", () => db.medicines);
}

export function getMedicine(id: string): Promise<Medicine> {
  return request(`/medicines/${id}`, () => {
    const found = db.medicines.find((m) => m.id === id);
    if (!found) throw new ApiError("Medicine not found", 404);
    return found;
  });
}

export function createMedicine(input: MedicineInput): Promise<Medicine> {
  return request("/medicines", () => {
    const supplier = db.suppliers.find((s) => s.id === input.supplierId);
    const created: Medicine = {
      ...input,
      id: nextId("MED", db.medicines.length),
      supplierName: supplier?.name ?? "Unassigned",
    };
    db.medicines = [created, ...db.medicines];
    return created;
  }, { method: "POST", body: input });
}

export function updateMedicine(id: string, input: MedicineInput): Promise<Medicine> {
  return request(`/medicines/${id}`, () => {
    const index = db.medicines.findIndex((m) => m.id === id);
    if (index < 0) throw new ApiError("Medicine not found", 404);
    const supplier = db.suppliers.find((s) => s.id === input.supplierId);
    const updated: Medicine = {
      ...input,
      id,
      supplierName: supplier?.name ?? "Unassigned",
    };
    db.medicines[index] = updated;
    return updated;
  }, { method: "PUT", body: input });
}

export function deleteMedicine(id: string): Promise<{ id: string }> {
  return request(`/medicines/${id}`, () => {
    db.medicines = db.medicines.filter((m) => m.id !== id);
    return { id };
  }, { method: "DELETE" });
}

export function getCategories(): Promise<string[]> {
  return request("/categories", () => CATEGORIES);
}

/* ---------------------------- stock movements ---------------------------- */

export function getStockTransactions(medicineId?: string): Promise<StockTransaction[]> {
  return request("/stock-transactions", () =>
    [...db.transactions]
      .filter((t) => !medicineId || t.medicineId === medicineId)
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt)),
    { query: { medicineId } },
  );
}

export function createStockTransaction(
  input: StockTransactionInput,
): Promise<StockTransaction> {
  return request("/stock-transactions", () => {
    const medicine = db.medicines.find((m) => m.id === input.medicineId);
    if (!medicine) throw new ApiError("Medicine not found", 404);

    const delta =
      input.type === "add"
        ? Math.abs(input.quantity)
        : input.type === "remove"
          ? -Math.abs(input.quantity)
          : input.quantity;

    if (medicine.quantity + delta < 0) {
      throw new ApiError("Stock cannot fall below zero");
    }
    medicine.quantity += delta;

    const created: StockTransaction = {
      ...input,
      quantity: delta,
      id: `TRX-${9000 + db.transactions.length}`,
      medicineName: medicine.name,
      createdAt: new Date().toISOString(),
    };
    db.transactions = [created, ...db.transactions];
    return created;
  }, { method: "POST", body: input });
}

export interface ReorderSuggestion {
  medicine: Medicine;
  suggestedQuantity: number;
  supplierName: string;
}

export function getReorderSuggestions(): Promise<ReorderSuggestion[]> {
  return request("/stock/reorder-suggestions", () =>
    db.medicines
      .filter((m) => {
        const status = getStockStatus(m);
        return status === "low_stock" || status === "out_of_stock";
      })
      .map((medicine) => ({
        medicine,
        suggestedQuantity: Math.max(medicine.reorderLevel * 2 - medicine.quantity, 20),
        supplierName: medicine.supplierName,
      })),
  );
}

/* -------------------------------- suppliers ------------------------------- */

export function getSuppliers(): Promise<Supplier[]> {
  return request("/suppliers", () => db.suppliers);
}

export function getSupplier(id: string): Promise<Supplier> {
  return request(`/suppliers/${id}`, () => {
    const found = db.suppliers.find((s) => s.id === id);
    if (!found) throw new ApiError("Supplier not found", 404);
    return found;
  });
}

export function createSupplier(input: SupplierInput): Promise<Supplier> {
  return request("/suppliers", () => {
    const created: Supplier = {
      ...input,
      id: nextId("SUP", db.suppliers.length),
      orderCount: 0,
      lastOrderDate: new Date().toISOString().slice(0, 10),
    };
    db.suppliers = [created, ...db.suppliers];
    return created;
  }, { method: "POST", body: input });
}

export function updateSupplier(id: string, input: SupplierInput): Promise<Supplier> {
  return request(`/suppliers/${id}`, () => {
    const index = db.suppliers.findIndex((s) => s.id === id);
    if (index < 0) throw new ApiError("Supplier not found", 404);
    const previous = db.suppliers[index]!;
    const updated: Supplier = { ...previous, ...input, id };
    db.suppliers[index] = updated;
    return updated;
  }, { method: "PUT", body: input });
}

export function deleteSupplier(id: string): Promise<{ id: string }> {
  return request(`/suppliers/${id}`, () => {
    db.suppliers = db.suppliers.filter((s) => s.id !== id);
    return { id };
  }, { method: "DELETE" });
}

/* ----------------------------- purchase orders ---------------------------- */

export function getPurchaseOrders(): Promise<PurchaseOrder[]> {
  return request("/purchase-orders", () =>
    [...db.purchaseOrders].sort((a, b) => b.orderDate.localeCompare(a.orderDate)),
  );
}

export function getPurchaseOrder(id: string): Promise<PurchaseOrder> {
  return request(`/purchase-orders/${id}`, () => {
    const found = db.purchaseOrders.find((p) => p.id === id);
    if (!found) throw new ApiError("Purchase order not found", 404);
    return found;
  });
}

export function createPurchaseOrder(input: PurchaseOrderInput): Promise<PurchaseOrder> {
  return request("/purchase-orders", () => {
    const supplier = db.suppliers.find((s) => s.id === input.supplierId);
    if (!supplier) throw new ApiError("Supplier not found", 404);
    if (input.lines.length === 0) throw new ApiError("Add at least one medicine");

    const created: PurchaseOrder = {
      ...input,
      id: `PO-${1052 + db.purchaseOrders.length - 10}`,
      supplierName: supplier.name,
      status: input.status ?? "pending",
      total: input.lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0),
    };
    db.purchaseOrders = [created, ...db.purchaseOrders];
    return created;
  }, { method: "POST", body: input });
}

export function updatePurchaseOrderStatus(
  id: string,
  status: PurchaseOrderStatus,
): Promise<PurchaseOrder> {
  return request(`/purchase-orders/${id}/status`, () => {
    const order = db.purchaseOrders.find((p) => p.id === id);
    if (!order) throw new ApiError("Purchase order not found", 404);
    order.status = status;
    if (status === "received") {
      for (const l of order.lines) {
        const medicine = db.medicines.find((m) => m.id === l.medicineId);
        if (medicine) medicine.quantity += l.quantity;
      }
    }
    return order;
  }, { method: "PATCH", body: { status } });
}

/* ----------------------------- expiry handling ---------------------------- */

export function getExpiryRecords(): Promise<ExpiryRecord[]> {
  return request("/expiry-records", () => db.expiryRecords);
}

export function setExpiryAction(
  medicineId: string,
  action: ExpiryAction,
): Promise<ExpiryRecord> {
  return request(`/expiry-records/${medicineId}`, () => {
    const record: ExpiryRecord = {
      medicineId,
      action,
      updatedAt: new Date().toISOString(),
    };
    db.expiryRecords = [
      record,
      ...db.expiryRecords.filter((r) => r.medicineId !== medicineId),
    ];
    if (action === "disposed" || action === "returned") {
      const medicine = db.medicines.find((m) => m.id === medicineId);
      if (medicine && medicine.quantity > 0) {
        db.transactions = [
          {
            id: `TRX-${9000 + db.transactions.length}`,
            medicineId,
            medicineName: medicine.name,
            type: "remove",
            quantity: -medicine.quantity,
            createdAt: new Date().toISOString(),
            user: "Expiry workflow",
            reason: action === "disposed" ? "Disposed expired batch" : "Returned to supplier",
          },
          ...db.transactions,
        ];
        medicine.quantity = 0;
      }
    }
    return record;
  }, { method: "PUT", body: { action } });
}

/* ------------------------------ notifications ----------------------------- */

export function getNotifications(): Promise<AppNotification[]> {
  return request("/notifications", () => db.notifications);
}

export function markNotificationRead(id: string): Promise<AppNotification> {
  return request(`/notifications/${id}/read`, () => {
    const found = db.notifications.find((n) => n.id === id);
    if (!found) throw new ApiError("Notification not found", 404);
    found.read = true;
    return found;
  }, { method: "PATCH" });
}

export function markAllNotificationsRead(): Promise<AppNotification[]> {
  return request("/notifications/read-all", () => {
    db.notifications = db.notifications.map((n) => ({ ...n, read: true }));
    return db.notifications;
  }, { method: "PATCH" });
}