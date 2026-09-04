import type { Medicine, StockStatus } from "./types";

export const STATUS_LABELS: Record<StockStatus, string> = {
  in_stock: "In Stock",
  low_stock: "Low Stock",
  out_of_stock: "Out of Stock",
  expiring_soon: "Expiring Soon",
  expired: "Expired",
};

export function daysUntil(dateIso: string, now = new Date()): number {
  const target = new Date(dateIso);
  return Math.ceil((target.getTime() - now.getTime()) / 86_400_000);
}

export function getStockStatus(medicine: Medicine, now = new Date()): StockStatus {
  const days = daysUntil(medicine.expiryDate, now);
  if (days < 0) return "expired";
  if (medicine.quantity <= 0) return "out_of_stock";
  if (days <= 30) return "expiring_soon";
  if (medicine.quantity <= medicine.reorderLevel) return "low_stock";
  return "in_stock";
}

export function stockValue(medicine: Medicine): number {
  return medicine.quantity * medicine.purchasePrice;
}

export function formatCurrency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatDate(dateIso: string): string {
  return new Date(dateIso).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function formatDateTime(dateIso: string): string {
  return new Date(dateIso).toLocaleString("en-US", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}