import {
  expiryRecords,
  medicines,
  notifications,
  purchaseOrders,
  stockTransactions,
  suppliers,
} from "./sample-data";
import type {
  AppNotification,
  ExpiryRecord,
  Medicine,
  PurchaseOrder,
  StockTransaction,
  Supplier,
} from "../domain/types";

/** Mutable in-memory database standing in for the future cloud database. */
export const db = {
  medicines: [...medicines] as Medicine[],
  suppliers: [...suppliers] as Supplier[],
  transactions: [...stockTransactions] as StockTransaction[],
  purchaseOrders: [...purchaseOrders] as PurchaseOrder[],
  expiryRecords: [...expiryRecords] as ExpiryRecord[],
  notifications: [...notifications] as AppNotification[],
};

export function nextId(prefix: string, count: number): string {
  return `${prefix}-${String(count + 1).padStart(3, "0")}`;
}