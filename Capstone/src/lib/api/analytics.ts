import { db } from "../data/store";
import { MONTHS } from "../data/sample-data";
import { request } from "./client";
import { daysUntil, getStockStatus, stockValue } from "../domain/medicine-status";
import type {
  DashboardCharts,
  DashboardMetrics,
  GreenMetrics,
  ReportFilters,
  ReportResult,
  SeriesPoint,
} from "../domain/types";

function metrics(): DashboardMetrics {
  const meds = db.medicines;
  const statuses = meds.map((m) => getStockStatus(m));
  const wasteUnits = meds
    .filter((m) => daysUntil(m.expiryDate) < 0)
    .reduce((sum, m) => sum + m.quantity, 0);
  const wasteValue = meds
    .filter((m) => daysUntil(m.expiryDate) < 0)
    .reduce((sum, m) => sum + stockValue(m), 0);

  return {
    totalMedicines: meds.length,
    totalStockUnits: meds.reduce((sum, m) => sum + m.quantity, 0),
    lowStock: statuses.filter((s) => s === "low_stock").length,
    outOfStock: statuses.filter((s) => s === "out_of_stock").length,
    expired: statuses.filter((s) => s === "expired").length,
    expiringIn30Days: meds.filter((m) => {
      const d = daysUntil(m.expiryDate);
      return d >= 0 && d <= 30;
    }).length,
    pendingOrders: db.purchaseOrders.filter((p) => p.status === "pending").length,
    inventoryValue: meds.reduce((sum, m) => sum + stockValue(m), 0),
    wasteUnits,
    wasteValue,
    paperlessTransactions: db.transactions.length + db.purchaseOrders.length,
    inventoryOptimization: Math.round(
      (statuses.filter((s) => s === "in_stock").length / Math.max(meds.length, 1)) * 100,
    ),
  };
}

export function getDashboardMetrics(): Promise<DashboardMetrics> {
  return request("/dashboard/metrics", metrics);
}

function charts(): DashboardCharts {
  const byCategory = new Map<string, { units: number; value: number }>();
  for (const m of db.medicines) {
    const entry = byCategory.get(m.category) ?? { units: 0, value: 0 };
    entry.units += m.quantity;
    entry.value += stockValue(m);
    byCategory.set(m.category, entry);
  }

  const stockLevels: SeriesPoint[] = [...db.medicines]
    .sort((a, b) => b.quantity - a.quantity)
    .slice(0, 8)
    .map((m) => ({
      label: m.name.split(" ")[0] ?? m.name,
      quantity: m.quantity,
      reorderLevel: m.reorderLevel,
    }));

  const movementSeed = [
    [2100, 1740],
    [2480, 1920],
    [2260, 2050],
    [2740, 2180],
    [2610, 2320],
    [2980, 2410],
  ];
  const expirySeed = [7, 6, 8, 5, 4, 3];
  const wasteSeed = [
    [340, 210],
    [300, 180],
    [265, 150],
    [220, 120],
    [190, 95],
    [160, 70],
  ];
  const purchaseSeed = [12400, 15100, 13800, 16250, 14900, 17400];

  return {
    stockLevels,
    stockMovement: MONTHS.map((label, i) => ({
      label,
      stockIn: movementSeed[i]![0]!,
      stockOut: movementSeed[i]![1]!,
    })),
    expiryTrend: MONTHS.map((label, i) => ({
      label,
      expiredItems: expirySeed[i]!,
      nearExpiry: expirySeed[i]! + 4,
    })),
    wasteTrend: MONTHS.map((label, i) => ({
      label,
      wasteUnits: wasteSeed[i]![0]!,
      wasteValue: wasteSeed[i]![1]!,
    })),
    categoryInventory: [...byCategory.entries()].map(([label, v]) => ({
      label,
      units: v.units,
      value: Math.round(v.value),
    })),
    purchaseTrend: MONTHS.map((label, i) => ({
      label,
      purchaseValue: purchaseSeed[i]!,
      orders: 6 + (i % 3) + 2,
    })),
  };
}

export function getDashboardCharts(): Promise<DashboardCharts> {
  return request("/dashboard/charts", charts);
}

export function getGreenMetrics(): Promise<GreenMetrics> {
  return request("/green/metrics", () => {
    const m = metrics();
    const near = db.medicines.filter((x) => {
      const d = daysUntil(x.expiryDate);
      return d >= 0 && d <= 90;
    }).length;

    const green: GreenMetrics = {
      wasteAvoidedUnits: 1480,
      reordersAvoided: 26,
      digitalTransactions: m.paperlessTransactions,
      paperlessReports: 64,
      inventoryOptimization: m.inventoryOptimization,
      storageEfficiency: 82,
      earlyExpiryDetections: near,
      monthly: MONTHS.map((label, i) => ({
        label,
        wasteAvoided: 180 + i * 45,
        reordersAvoided: 2 + i,
      })),
      paperlessTrend: MONTHS.map((label, i) => ({
        label,
        digitalRecords: 90 + i * 28,
        printedRecords: Math.max(30 - i * 5, 2),
      })),
    };
    return green;
  });
}

/* --------------------------------- reports -------------------------------- */

export type ReportId =
  | "current_inventory"
  | "low_stock"
  | "expired"
  | "near_expiry"
  | "stock_movement"
  | "purchase"
  | "supplier"
  | "waste";

export const REPORT_OPTIONS: { id: ReportId; title: string; description: string }[] = [
  { id: "current_inventory", title: "Current inventory", description: "All medicines with quantity, value and status" },
  { id: "low_stock", title: "Low stock", description: "Items at or below their reorder level" },
  { id: "expired", title: "Expired medicines", description: "Batches past their expiry date" },
  { id: "near_expiry", title: "Near expiry", description: "Batches expiring within 90 days" },
  { id: "stock_movement", title: "Stock movement", description: "Additions, removals and adjustments" },
  { id: "purchase", title: "Purchase report", description: "Purchase orders with totals and status" },
  { id: "supplier", title: "Supplier report", description: "Suppliers with order history summary" },
  { id: "waste", title: "Medicine waste", description: "Expired units, estimated value lost" },
];

function inRange(dateIso: string, filters: ReportFilters): boolean {
  const value = dateIso.slice(0, 10);
  if (filters.from && value < filters.from) return false;
  if (filters.to && value > filters.to) return false;
  return true;
}

export function getReport(id: ReportId, filters: ReportFilters = {}): Promise<ReportResult> {
  return request(`/reports/${id}`, () => {
    const generatedAt = new Date().toISOString();
    const meds = db.medicines.filter(
      (m) => !filters.category || filters.category === "all" || m.category === filters.category,
    );

    switch (id) {
      case "low_stock":
        return {
          id,
          title: "Low stock report",
          generatedAt,
          columns: [
            { key: "id", label: "ID" },
            { key: "name", label: "Medicine" },
            { key: "quantity", label: "Qty" },
            { key: "reorderLevel", label: "Reorder level" },
            { key: "supplierName", label: "Supplier" },
          ],
          rows: meds
            .filter((m) => m.quantity <= m.reorderLevel)
            .map((m) => ({
              id: m.id,
              name: m.name,
              quantity: m.quantity,
              reorderLevel: m.reorderLevel,
              supplierName: m.supplierName,
            })),
        };
      case "expired":
      case "waste": {
        const rows = meds
          .filter((m) => daysUntil(m.expiryDate) < 0)
          .map((m) => ({
            id: m.id,
            name: m.name,
            batchNumber: m.batchNumber,
            expiryDate: m.expiryDate,
            quantity: m.quantity,
            value: Math.round(stockValue(m) * 100) / 100,
          }));
        return {
          id,
          title: id === "expired" ? "Expired medicine report" : "Medicine waste report (estimated)",
          generatedAt,
          columns: [
            { key: "id", label: "ID" },
            { key: "name", label: "Medicine" },
            { key: "batchNumber", label: "Batch" },
            { key: "expiryDate", label: "Expiry" },
            { key: "quantity", label: "Units" },
            { key: "value", label: "Est. value" },
          ],
          rows,
        };
      }
      case "near_expiry":
        return {
          id,
          title: "Near-expiry report (next 90 days)",
          generatedAt,
          columns: [
            { key: "id", label: "ID" },
            { key: "name", label: "Medicine" },
            { key: "expiryDate", label: "Expiry" },
            { key: "daysLeft", label: "Days left" },
            { key: "quantity", label: "Units" },
          ],
          rows: meds
            .filter((m) => {
              const d = daysUntil(m.expiryDate);
              return d >= 0 && d <= 90;
            })
            .map((m) => ({
              id: m.id,
              name: m.name,
              expiryDate: m.expiryDate,
              daysLeft: daysUntil(m.expiryDate),
              quantity: m.quantity,
            })),
        };
      case "stock_movement":
        return {
          id,
          title: "Stock movement report",
          generatedAt,
          columns: [
            { key: "id", label: "Transaction" },
            { key: "medicineName", label: "Medicine" },
            { key: "type", label: "Type" },
            { key: "quantity", label: "Qty" },
            { key: "createdAt", label: "Date" },
            { key: "user", label: "User" },
          ],
          rows: db.transactions
            .filter((t) => inRange(t.createdAt, filters))
            .map((t) => ({
              id: t.id,
              medicineName: t.medicineName,
              type: t.type,
              quantity: t.quantity,
              createdAt: t.createdAt.slice(0, 10),
              user: t.user,
            })),
        };
      case "purchase":
        return {
          id,
          title: "Purchase report",
          generatedAt,
          columns: [
            { key: "id", label: "Order" },
            { key: "supplierName", label: "Supplier" },
            { key: "status", label: "Status" },
            { key: "orderDate", label: "Ordered" },
            { key: "items", label: "Items" },
            { key: "total", label: "Total" },
          ],
          rows: db.purchaseOrders
            .filter((p) => inRange(p.orderDate, filters))
            .map((p) => ({
              id: p.id,
              supplierName: p.supplierName,
              status: p.status,
              orderDate: p.orderDate,
              items: p.lines.length,
              total: Math.round(p.total * 100) / 100,
            })),
        };
      case "supplier":
        return {
          id,
          title: "Supplier report",
          generatedAt,
          columns: [
            { key: "id", label: "ID" },
            { key: "name", label: "Supplier" },
            { key: "contactPerson", label: "Contact" },
            { key: "phone", label: "Phone" },
            { key: "orderCount", label: "Orders" },
            { key: "lastOrderDate", label: "Last order" },
          ],
          rows: db.suppliers.map((s) => ({
            id: s.id,
            name: s.name,
            contactPerson: s.contactPerson,
            phone: s.phone,
            orderCount: s.orderCount,
            lastOrderDate: s.lastOrderDate,
          })),
        };
      default:
        return {
          id,
          title: "Current inventory report",
          generatedAt,
          columns: [
            { key: "id", label: "ID" },
            { key: "name", label: "Medicine" },
            { key: "category", label: "Category" },
            { key: "quantity", label: "Qty" },
            { key: "expiryDate", label: "Expiry" },
            { key: "value", label: "Stock value" },
          ],
          rows: meds.map((m) => ({
            id: m.id,
            name: m.name,
            category: m.category,
            quantity: m.quantity,
            expiryDate: m.expiryDate,
            value: Math.round(stockValue(m) * 100) / 100,
          })),
        };
    }
  }, { query: { from: filters.from, to: filters.to, category: filters.category } });
}

/** Client-side export (paperless demo). Replace with a backend document endpoint later. */
export function exportReport(
  report: ReportResult,
  format: "csv" | "pdf",
): Promise<{ filename: string; size: string }> {
  return Promise.resolve({
    filename: `${report.id}-${report.generatedAt.slice(0, 10)}.${format}`,
    size: `${Math.max(Math.round(report.rows.length * 0.4), 1)} KB`,
  });
}