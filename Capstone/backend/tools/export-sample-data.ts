/**
 * Exports the frontend  dataset (src/lib/data/sample-data.ts) plus the
 * demo users to backend/seed_data.json, which backend/seed.py loads.
 * Run from the project root:  bun backend/tools/export-sample-data.ts
 */
import { writeFileSync } from "node:fs";
import {
  CATEGORIES,
  expiryRecords,
  medicines,
  notifications,
  purchaseOrders,
  stockTransactions,
  suppliers,
} from "../../src/lib/data/sample-data";

const users = [
  { id: "USR-101", name: "Priya Nair", email: "priya.nair@greenpharm.example", role: "pharmacist", initials: "PN" },
  { id: "USR-102", name: "Jordan Mensah", email: "jordan.mensah@greenpharm.example", role: "inventory_manager", initials: "JM" },
  { id: "USR-103", name: "Alina Frost", email: "alina.frost@greenpharm.example", role: "administrator", initials: "AF" },
];

const payload = {
  categories: CATEGORIES,
  users,
  suppliers,
  medicines,
  stockTransactions,
  purchaseOrders,
  expiryRecords,
  notifications,
};

writeFileSync(
  new URL("../seed_data.json", import.meta.url),
  JSON.stringify(payload, null, 2),
);
console.log(
  `exported ${medicines.length} medicines, ${suppliers.length} suppliers, ` +
    `${stockTransactions.length} transactions, ${purchaseOrders.length} orders, ` +
    `${expiryRecords.length} expiry records, ${notifications.length} notifications`,
);
