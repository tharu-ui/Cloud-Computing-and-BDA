// Domain models. These mirror the shapes the future FastAPI REST backend will return.

export type UserRole = "pharmacist" | "inventory_manager" | "administrator";

export interface AuthUser {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  initials: string;
}

export type StockStatus =
  | "in_stock"
  | "low_stock"
  | "out_of_stock"
  | "expiring_soon"
  | "expired";

export interface Medicine {
  id: string;
  name: string;
  category: string;
  manufacturer: string;
  batchNumber: string;
  quantity: number;
  reorderLevel: number;
  purchasePrice: number;
  sellingPrice: number;
  manufacturingDate: string;
  expiryDate: string;
  supplierId: string;
  supplierName: string;
  storageLocation: string;
}

export type MedicineInput = Omit<Medicine, "id" | "supplierName">;

export type TransactionType = "add" | "remove" | "adjust";

export interface StockTransaction {
  id: string;
  medicineId: string;
  medicineName: string;
  type: TransactionType;
  quantity: number;
  createdAt: string;
  user: string;
  reason: string;
}

export type StockTransactionInput = Omit<
  StockTransaction,
  "id" | "createdAt" | "medicineName"
>;

export interface Supplier {
  id: string;
  name: string;
  contactPerson: string;
  phone: string;
  email: string;
  address: string;
  medicinesSupplied: string[];
  orderCount: number;
  lastOrderDate: string;
}

export type SupplierInput = Omit<Supplier, "id" | "orderCount" | "lastOrderDate">;

export type PurchaseOrderStatus = "pending" | "ordered" | "received" | "cancelled";

export interface PurchaseOrderLine {
  medicineId: string;
  medicineName: string;
  quantity: number;
  unitPrice: number;
}

export interface PurchaseOrder {
  id: string;
  supplierId: string;
  supplierName: string;
  status: PurchaseOrderStatus;
  orderDate: string;
  expectedDelivery: string;
  lines: PurchaseOrderLine[];
  total: number;
}

export type PurchaseOrderInput = Omit<
  PurchaseOrder,
  "id" | "total" | "supplierName" | "status"
> & { status?: PurchaseOrderStatus };

export type ExpiryAction = "none" | "returned" | "disposed" | "review";

export interface ExpiryRecord {
  medicineId: string;
  action: ExpiryAction;
  updatedAt: string;
}

export interface DashboardMetrics {
  totalMedicines: number;
  totalStockUnits: number;
  lowStock: number;
  outOfStock: number;
  expired: number;
  expiringIn30Days: number;
  pendingOrders: number;
  inventoryValue: number;
  wasteUnits: number;
  wasteValue: number;
  paperlessTransactions: number;
  inventoryOptimization: number;
}

export interface SeriesPoint {
  label: string;
  [key: string]: string | number;
}

export interface DashboardCharts {
  stockLevels: SeriesPoint[];
  stockMovement: SeriesPoint[];
  expiryTrend: SeriesPoint[];
  wasteTrend: SeriesPoint[];
  categoryInventory: SeriesPoint[];
  purchaseTrend: SeriesPoint[];
}

export interface GreenMetrics {
  wasteAvoidedUnits: number;
  reordersAvoided: number;
  digitalTransactions: number;
  paperlessReports: number;
  inventoryOptimization: number;
  storageEfficiency: number;
  earlyExpiryDetections: number;
  monthly: SeriesPoint[];
  paperlessTrend: SeriesPoint[];
}

export type NotificationKind =
  | "low_stock"
  | "expiring"
  | "expired"
  | "pending_order"
  | "unusual_stock";

export interface AppNotification {
  id: string;
  kind: NotificationKind;
  title: string;
  message: string;
  createdAt: string;
  read: boolean;
}

export interface ReportRow {
  [key: string]: string | number;
}

export interface ReportResult {
  id: string;
  title: string;
  columns: { key: string; label: string }[];
  rows: ReportRow[];
  generatedAt: string;
}

export interface ReportFilters {
  from?: string;
  to?: string;
  category?: string;
}