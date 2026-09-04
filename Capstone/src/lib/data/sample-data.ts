import type {
  AppNotification,
  ExpiryRecord,
  Medicine,
  PurchaseOrder,
  StockTransaction,
  Supplier,
} from "../domain/types";

const DAY = 86_400_000;
const now = Date.now();

function iso(offsetDays: number): string {
  return new Date(now + offsetDays * DAY).toISOString();
}
function day(offsetDays: number): string {
  return iso(offsetDays).slice(0, 10);
}

export const CATEGORIES = [
  "Analgesic",
  "Antibiotic",
  "Antidiabetic",
  "Cardiovascular",
  "Respiratory",
  "Gastrointestinal",
  "Vitamin & Supplement",
  "Dermatological",
];

export const suppliers: Supplier[] = [
  {
    id: "SUP-001",
    name: "MediSource Distributors",
    contactPerson: "Anita Raymond",
    phone: "+1 415 555 0148",
    email: "orders@medisource.example",
    address: "182 Harbor Way, Portland, OR 97209",
    medicinesSupplied: ["Paracetamol 500mg", "Ibuprofen 400mg", "Amoxicillin 500mg"],
    orderCount: 42,
    lastOrderDate: day(-9),
  },
  {
    id: "SUP-002",
    name: "GreenLeaf Pharma Supply",
    contactPerson: "Daniel Okafor",
    phone: "+1 312 555 0182",
    email: "sales@greenleafpharma.example",
    address: "9 Willow Park, Chicago, IL 60614",
    medicinesSupplied: ["Metformin 850mg", "Atorvastatin 20mg", "Vitamin D3 1000IU"],
    orderCount: 31,
    lastOrderDate: day(-4),
  },
  {
    id: "SUP-003",
    name: "Nordic Health Logistics",
    contactPerson: "Sara Lindqvist",
    phone: "+1 206 555 0110",
    email: "support@nordichealth.example",
    address: "44 Cedar Street, Seattle, WA 98101",
    medicinesSupplied: ["Salbutamol Inhaler", "Cetirizine 10mg", "Omeprazole 20mg"],
    orderCount: 27,
    lastOrderDate: day(-16),
  },
  {
    id: "SUP-004",
    name: "Apex Medical Trading",
    contactPerson: "Marcus Lee",
    phone: "+1 617 555 0173",
    email: "procurement@apexmedical.example",
    address: "77 Beacon Row, Boston, MA 02108",
    medicinesSupplied: ["Azithromycin 250mg", "Losartan 50mg", "Hydrocortisone Cream"],
    orderCount: 19,
    lastOrderDate: day(-22),
  },
  {
    id: "SUP-005",
    name: "Vitalis Wholesale",
    contactPerson: "Priya Nair",
    phone: "+1 512 555 0139",
    email: "hello@vitaliswholesale.example",
    address: "301 Lakeview Blvd, Austin, TX 78701",
    medicinesSupplied: ["Insulin Glargine", "Aspirin 75mg", "Multivitamin Complex"],
    orderCount: 24,
    lastOrderDate: day(-2),
  },
  {
    id: "SUP-006",
    name: "Continental BioCare",
    contactPerson: "Tomas Ferreira",
    phone: "+1 305 555 0124",
    email: "orders@continentalbio.example",
    address: "58 Palm Court, Miami, FL 33131",
    medicinesSupplied: ["Ceftriaxone 1g", "Pantoprazole 40mg", "Zinc Syrup"],
    orderCount: 12,
    lastOrderDate: day(-38),
  },
];

interface Seed {
  name: string;
  category: string;
  manufacturer: string;
  qty: number;
  reorder: number;
  purchase: number;
  selling: number;
  mfg: number;
  exp: number;
  supplier: number;
  location: string;
}

const seeds: Seed[] = [
  { name: "Paracetamol 500mg", category: "Analgesic", manufacturer: "Corvex Labs", qty: 1240, reorder: 300, purchase: 0.06, selling: 0.14, mfg: -300, exp: 420, supplier: 0, location: "A1-S2" },
  { name: "Ibuprofen 400mg", category: "Analgesic", manufacturer: "Corvex Labs", qty: 180, reorder: 250, purchase: 0.09, selling: 0.2, mfg: -260, exp: 300, supplier: 0, location: "A1-S3" },
  { name: "Amoxicillin 500mg", category: "Antibiotic", manufacturer: "Belmar Pharma", qty: 640, reorder: 200, purchase: 0.22, selling: 0.48, mfg: -180, exp: 210, supplier: 0, location: "B2-S1" },
  { name: "Azithromycin 250mg", category: "Antibiotic", manufacturer: "Belmar Pharma", qty: 95, reorder: 120, purchase: 0.55, selling: 1.1, mfg: -150, exp: 24, supplier: 3, location: "B2-S2" },
  { name: "Ceftriaxone 1g Injection", category: "Antibiotic", manufacturer: "Nuvia Biotech", qty: 0, reorder: 60, purchase: 2.4, selling: 4.75, mfg: -120, exp: 240, supplier: 5, location: "C1-COLD" },
  { name: "Metformin 850mg", category: "Antidiabetic", manufacturer: "Halden Health", qty: 860, reorder: 250, purchase: 0.12, selling: 0.26, mfg: -220, exp: 360, supplier: 1, location: "A2-S1" },
  { name: "Insulin Glargine 100IU", category: "Antidiabetic", manufacturer: "Nuvia Biotech", qty: 74, reorder: 40, purchase: 12.5, selling: 22, mfg: -90, exp: 55, supplier: 4, location: "C1-COLD" },
  { name: "Atorvastatin 20mg", category: "Cardiovascular", manufacturer: "Halden Health", qty: 510, reorder: 180, purchase: 0.18, selling: 0.4, mfg: -200, exp: 330, supplier: 1, location: "A3-S2" },
  { name: "Losartan 50mg", category: "Cardiovascular", manufacturer: "Corvex Labs", qty: 140, reorder: 150, purchase: 0.15, selling: 0.34, mfg: -240, exp: 85, supplier: 3, location: "A3-S3" },
  { name: "Aspirin 75mg", category: "Cardiovascular", manufacturer: "Belmar Pharma", qty: 1520, reorder: 400, purchase: 0.04, selling: 0.11, mfg: -190, exp: 470, supplier: 4, location: "A3-S1" },
  { name: "Salbutamol Inhaler 100mcg", category: "Respiratory", manufacturer: "Aeris Medical", qty: 210, reorder: 60, purchase: 3.1, selling: 6.2, mfg: -140, exp: 260, supplier: 2, location: "D1-S1" },
  { name: "Cetirizine 10mg", category: "Respiratory", manufacturer: "Aeris Medical", qty: 430, reorder: 150, purchase: 0.07, selling: 0.18, mfg: -170, exp: 28, supplier: 2, location: "D1-S2" },
  { name: "Montelukast 10mg", category: "Respiratory", manufacturer: "Aeris Medical", qty: 88, reorder: 100, purchase: 0.31, selling: 0.68, mfg: -160, exp: 145, supplier: 2, location: "D1-S3" },
  { name: "Omeprazole 20mg", category: "Gastrointestinal", manufacturer: "Halden Health", qty: 690, reorder: 200, purchase: 0.11, selling: 0.25, mfg: -210, exp: 390, supplier: 2, location: "B1-S1" },
  { name: "Pantoprazole 40mg", category: "Gastrointestinal", manufacturer: "Nuvia Biotech", qty: 60, reorder: 120, purchase: 0.19, selling: 0.42, mfg: -230, exp: -12, supplier: 5, location: "B1-S2" },
  { name: "Oral Rehydration Salts", category: "Gastrointestinal", manufacturer: "Corvex Labs", qty: 940, reorder: 250, purchase: 0.13, selling: 0.3, mfg: -100, exp: 500, supplier: 0, location: "B1-S3" },
  { name: "Vitamin D3 1000IU", category: "Vitamin & Supplement", manufacturer: "Halden Health", qty: 780, reorder: 200, purchase: 0.08, selling: 0.2, mfg: -250, exp: 410, supplier: 1, location: "E1-S1" },
  { name: "Multivitamin Complex", category: "Vitamin & Supplement", manufacturer: "Vitalis Labs", qty: 320, reorder: 120, purchase: 0.16, selling: 0.38, mfg: -180, exp: 62, supplier: 4, location: "E1-S2" },
  { name: "Zinc Syrup 100ml", category: "Vitamin & Supplement", manufacturer: "Nuvia Biotech", qty: 145, reorder: 80, purchase: 1.2, selling: 2.6, mfg: -130, exp: -35, supplier: 5, location: "E1-S3" },
  { name: "Iron & Folic Acid", category: "Vitamin & Supplement", manufacturer: "Vitalis Labs", qty: 260, reorder: 100, purchase: 0.1, selling: 0.24, mfg: -160, exp: 205, supplier: 4, location: "E2-S1" },
  { name: "Hydrocortisone Cream 1%", category: "Dermatological", manufacturer: "Aeris Medical", qty: 118, reorder: 50, purchase: 1.4, selling: 3.1, mfg: -110, exp: 175, supplier: 3, location: "F1-S1" },
  { name: "Clotrimazole Cream 1%", category: "Dermatological", manufacturer: "Belmar Pharma", qty: 42, reorder: 60, purchase: 1.15, selling: 2.5, mfg: -140, exp: 78, supplier: 3, location: "F1-S2" },
  { name: "Calamine Lotion 100ml", category: "Dermatological", manufacturer: "Vitalis Labs", qty: 0, reorder: 40, purchase: 0.95, selling: 2.2, mfg: -220, exp: 130, supplier: 4, location: "F1-S3" },
  { name: "Doxycycline 100mg", category: "Antibiotic", manufacturer: "Belmar Pharma", qty: 205, reorder: 90, purchase: 0.28, selling: 0.6, mfg: -170, exp: 18, supplier: 0, location: "B2-S3" },
];

export const medicines: Medicine[] = seeds.map((s, i) => ({
  id: `MED-${String(i + 1).padStart(3, "0")}`,
  name: s.name,
  category: s.category,
  manufacturer: s.manufacturer,
  batchNumber: `BN-${2400 + i * 7}`,
  quantity: s.qty,
  reorderLevel: s.reorder,
  purchasePrice: s.purchase,
  sellingPrice: s.selling,
  manufacturingDate: day(s.mfg),
  expiryDate: day(s.exp),
  supplierId: suppliers[s.supplier]!.id,
  supplierName: suppliers[s.supplier]!.name,
  storageLocation: s.location,
}));

const txSeeds: [number, "add" | "remove" | "adjust", number, number, string, string][] = [
  [0, "add", 500, -1, "A. Raymond delivery", "Purchase order PO-1042 received"],
  [1, "remove", 60, -1, "Priya N.", "Dispensed against prescriptions"],
  [5, "remove", 120, -2, "Jordan M.", "Ward transfer"],
  [3, "adjust", -8, -2, "Store audit", "Cycle count correction"],
  [10, "add", 80, -3, "S. Lindqvist delivery", "Purchase order PO-1039 received"],
  [11, "remove", 95, -4, "Priya N.", "Retail counter sales"],
  [6, "add", 40, -5, "Cold chain intake", "Refrigerated delivery verified"],
  [14, "remove", 45, -6, "Disposal team", "Expired batch removed from shelf"],
  [8, "remove", 70, -7, "Jordan M.", "Retail counter sales"],
  [16, "add", 300, -8, "D. Okafor delivery", "Purchase order PO-1035 received"],
  [2, "remove", 150, -9, "Priya N.", "Bulk clinic order"],
  [18, "remove", 30, -10, "Disposal team", "Expired syrup disposed"],
  [21, "adjust", 6, -11, "Store audit", "Recount after stocktake"],
  [23, "remove", 55, -12, "Priya N.", "Dispensed against prescriptions"],
  [9, "add", 600, -14, "A. Raymond delivery", "Quarterly bulk restock"],
  [13, "remove", 110, -16, "Jordan M.", "Retail counter sales"],
  [4, "remove", 60, -18, "Ward request", "Injection stock issued to clinic"],
  [19, "add", 150, -20, "M. Lee delivery", "Purchase order PO-1028 received"],
  [7, "remove", 90, -22, "Priya N.", "Retail counter sales"],
  [17, "add", 200, -25, "T. Ferreira delivery", "Supplement restock"],
];

export const stockTransactions: StockTransaction[] = txSeeds.map(
  ([medIndex, type, qty, dayOffset, user, reason], i) => ({
    id: `TRX-${9000 + i}`,
    medicineId: medicines[medIndex]!.id,
    medicineName: medicines[medIndex]!.name,
    type,
    quantity: qty,
    createdAt: iso(dayOffset),
    user,
    reason,
  }),
);

function line(medIndex: number, quantity: number) {
  const m = medicines[medIndex]!;
  return {
    medicineId: m.id,
    medicineName: m.name,
    quantity,
    unitPrice: m.purchasePrice,
  };
}

function total(lines: { quantity: number; unitPrice: number }[]) {
  return lines.reduce((sum, l) => sum + l.quantity * l.unitPrice, 0);
}

const poSeeds: {
  id: string;
  supplier: number;
  status: PurchaseOrder["status"];
  order: number;
  delivery: number;
  lines: { medicineId: string; medicineName: string; quantity: number; unitPrice: number }[];
}[] = [
  { id: "PO-1051", supplier: 0, status: "pending", order: -1, delivery: 6, lines: [line(1, 500), line(0, 800)] },
  { id: "PO-1050", supplier: 3, status: "pending", order: -2, delivery: 8, lines: [line(3, 300), line(22, 100)] },
  { id: "PO-1049", supplier: 5, status: "ordered", order: -4, delivery: 3, lines: [line(4, 120), line(14, 250)] },
  { id: "PO-1048", supplier: 2, status: "ordered", order: -6, delivery: 5, lines: [line(12, 200), line(11, 400)] },
  { id: "PO-1047", supplier: 4, status: "pending", order: -3, delivery: 10, lines: [line(22, 80), line(17, 200)] },
  { id: "PO-1046", supplier: 1, status: "received", order: -12, delivery: -5, lines: [line(5, 600), line(7, 400)] },
  { id: "PO-1045", supplier: 0, status: "received", order: -18, delivery: -11, lines: [line(2, 500)] },
  { id: "PO-1044", supplier: 2, status: "cancelled", order: -21, delivery: -14, lines: [line(10, 60)] },
  { id: "PO-1043", supplier: 4, status: "received", order: -26, delivery: -19, lines: [line(6, 60), line(19, 300)] },
  { id: "PO-1042", supplier: 5, status: "received", order: -33, delivery: -27, lines: [line(18, 150), line(15, 400)] },
];

export const purchaseOrders: PurchaseOrder[] = poSeeds.map((p) => ({
  id: p.id,
  supplierId: suppliers[p.supplier]!.id,
  supplierName: suppliers[p.supplier]!.name,
  status: p.status,
  orderDate: day(p.order),
  expectedDelivery: day(p.delivery),
  lines: p.lines,
  total: total(p.lines),
}));

export const expiryRecords: ExpiryRecord[] = [
  { medicineId: "MED-015", action: "review", updatedAt: iso(-3) },
  { medicineId: "MED-019", action: "disposed", updatedAt: iso(-6) },
];

export const notifications: AppNotification[] = [
  {
    id: "NTF-01",
    kind: "expired",
    title: "Expired batch on shelf",
    message: "Pantoprazole 40mg (BN-2498) expired 12 days ago and is still recorded in stock.",
    createdAt: iso(-0.2),
    read: false,
  },
  {
    id: "NTF-02",
    kind: "expiring",
    title: "3 medicines expiring within 30 days",
    message: "Doxycycline 100mg, Azithromycin 250mg and Cetirizine 10mg need action.",
    createdAt: iso(-0.5),
    read: false,
  },
  {
    id: "NTF-03",
    kind: "low_stock",
    title: "Low stock: Ibuprofen 400mg",
    message: "180 units remaining, below the reorder level of 250.",
    createdAt: iso(-1),
    read: false,
  },
  {
    id: "NTF-04",
    kind: "pending_order",
    title: "3 purchase orders pending approval",
    message: "PO-1051, PO-1050 and PO-1047 have not been sent to suppliers yet.",
    createdAt: iso(-1.4),
    read: false,
  },
  {
    id: "NTF-05",
    kind: "unusual_stock",
    title: "Unusual stock change detected",
    message: "Amoxicillin 500mg dropped by 150 units in a single transaction.",
    createdAt: iso(-2),
    read: true,
  },
  {
    id: "NTF-06",
    kind: "low_stock",
    title: "Out of stock: Ceftriaxone 1g Injection",
    message: "Cold-chain item unavailable. Reorder suggested from Continental BioCare.",
    createdAt: iso(-2.5),
    read: true,
  },
];

export const MONTHS = ["Mar", "Apr", "May", "Jun", "Jul", "Aug"];

import type { PurchaseOrder as _PO } from "../domain/types";
export type { _PO };