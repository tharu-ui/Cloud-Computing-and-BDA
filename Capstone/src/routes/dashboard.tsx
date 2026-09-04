import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Boxes,
  CalendarClock,
  CircleSlash,
  Leaf,
  Package,
  Recycle,
  ShoppingCart,
  TrendingDown,
  Wallet,
} from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { AXIS, ChartCard } from "@/components/app/chart-card";
import { ErrorBlock, LoadingBlock } from "@/components/app/data-states";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Button } from "@/components/ui/button";
import { getDashboardCharts, getDashboardMetrics } from "@/lib/api/analytics";
import { formatCurrency } from "@/lib/domain/medicine-status";

export const Route = createFileRoute("/dashboard")({
  head: () => ({
    meta: [
      { title: "Dashboard — GreenPharm Inventory" },
      {
        name: "description",
        content:
          "Live overview of pharmacy stock levels, expiry risk, purchase orders, inventory value and green computing indicators.",
      },
      { property: "og:title", content: "Dashboard — GreenPharm Inventory" },
      {
        property: "og:description",
        content: "Stock, expiry, purchasing and sustainability indicators at a glance.",
      },
    ],
  }),
  component: DashboardPage,
});

const PIE_COLORS = [
  "var(--chart-1)",
  "var(--chart-2)",
  "var(--chart-3)",
  "var(--chart-4)",
  "var(--chart-5)",
  "var(--brand)",
  "var(--info)",
  "var(--warning)",
];

function DashboardPage() {
  const metrics = useQuery({ queryKey: ["dashboard", "metrics"], queryFn: getDashboardMetrics });
  const charts = useQuery({ queryKey: ["dashboard", "charts"], queryFn: getDashboardCharts });

  return (
    <AppShell>
      <PageHeader
        title="Inventory dashboard"
        description="Figures update as you record stock, expiry and purchasing actions."
        actions={
          <>
            <Button variant="outline" asChild>
              <Link to="/reports">View reports</Link>
            </Button>
            <Button asChild>
              <Link to="/purchase-orders">New purchase order</Link>
            </Button>
          </>
        }
      />

      {metrics.isPending ? (
        <LoadingBlock rows={4} />
      ) : metrics.isError || !metrics.data ? (
        <ErrorBlock onRetry={() => metrics.refetch()} />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
          <StatCard label="Total medicines" value={metrics.data.totalMedicines} icon={Package} />
          <StatCard
            label="Total stock units"
            value={metrics.data.totalStockUnits.toLocaleString()}
            icon={Boxes}
          />
          <StatCard
            label="Low stock"
            value={metrics.data.lowStock}
            tone="warning"
            hint="At or below reorder level"
            icon={TrendingDown}
          />
          <StatCard
            label="Out of stock"
            value={metrics.data.outOfStock}
            tone="default"
            icon={CircleSlash}
          />
          <StatCard
            label="Expired"
            value={metrics.data.expired}
            tone="danger"
            hint={`${metrics.data.wasteUnits.toLocaleString()} units affected`}
            icon={AlertTriangle}
          />
          <StatCard
            label="Expiring in 30 days"
            value={metrics.data.expiringIn30Days}
            tone="info"
            icon={CalendarClock}
          />
          <StatCard
            label="Pending purchase orders"
            value={metrics.data.pendingOrders}
            icon={ShoppingCart}
          />
          <StatCard
            label="Inventory value"
            value={formatCurrency(metrics.data.inventoryValue)}
            icon={Wallet}
            tone="success"
          />
          <StatCard
            label="Medicine waste (est.)"
            value={formatCurrency(metrics.data.wasteValue)}
            hint="Expired stock still on record"
            icon={Recycle}
            tone="danger"
          />
          <StatCard
            label="Inventory optimisation"
            value={`${metrics.data.inventoryOptimization}%`}
            hint="System indicator — estimated"
            icon={Leaf}
            tone="success"
          />
        </div>
      )}

      {charts.isPending ? (
        <LoadingBlock rows={6} />
      ) : charts.isError || !charts.data ? (
        <ErrorBlock onRetry={() => charts.refetch()} />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          <ChartCard
            title="Inventory stock levels"
            description="Top 8 medicines by quantity against reorder level"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.data.stockLevels}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...AXIS} />
                <YAxis {...AXIS} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="quantity" name="Quantity" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="reorderLevel"
                  name="Reorder level"
                  fill="var(--chart-4)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Monthly stock movement" description="Units received vs units issued">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.data.stockMovement}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...AXIS} />
                <YAxis {...AXIS} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Area
                  type="monotone"
                  dataKey="stockIn"
                  name="Stock in"
                  stroke="var(--chart-2)"
                  fill="var(--chart-2)"
                  fillOpacity={0.18}
                />
                <Area
                  type="monotone"
                  dataKey="stockOut"
                  name="Stock out"
                  stroke="var(--chart-1)"
                  fill="var(--chart-1)"
                  fillOpacity={0.12}
                />
              </AreaChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Medicine expiry trends" description="Expired vs near-expiry batches">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.data.expiryTrend}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...AXIS} />
                <YAxis {...AXIS} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="expiredItems"
                  name="Expired"
                  stroke="var(--chart-5)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="nearExpiry"
                  name="Near expiry"
                  stroke="var(--chart-4)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard
            title="Medicine waste trends"
            description="Estimated wasted units and value per month"
          >
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.data.wasteTrend}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...AXIS} />
                <YAxis {...AXIS} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Bar dataKey="wasteUnits" name="Units" fill="var(--chart-5)" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="wasteValue"
                  name="Est. value"
                  fill="var(--chart-3)"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Category-wise inventory" description="Share of stock units by category">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.data.categoryInventory}
                  dataKey="units"
                  nameKey="label"
                  innerRadius={45}
                  outerRadius={85}
                  paddingAngle={2}
                >
                  {charts.data.categoryInventory.map((entry, i) => (
                    <Cell key={String(entry.label)} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 11 }} />
              </PieChart>
            </ResponsiveContainer>
          </ChartCard>

          <ChartCard title="Monthly purchase trends" description="Purchase value and order count">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.data.purchaseTrend}>
                <CartesianGrid stroke="var(--border)" vertical={false} />
                <XAxis dataKey="label" {...AXIS} />
                <YAxis {...AXIS} />
                <Tooltip contentStyle={{ fontSize: 12 }} />
                <Legend wrapperStyle={{ fontSize: 12 }} />
                <Line
                  type="monotone"
                  dataKey="purchaseValue"
                  name="Purchase value"
                  stroke="var(--chart-1)"
                  strokeWidth={2}
                />
                <Line
                  type="monotone"
                  dataKey="orders"
                  name="Orders"
                  stroke="var(--chart-2)"
                  strokeWidth={2}
                />
              </LineChart>
            </ResponsiveContainer>
          </ChartCard>
        </div>
      )}
    </AppShell>
  );
}