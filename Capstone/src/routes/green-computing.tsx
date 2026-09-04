import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Leaf, Recycle, ServerCog, FileCheck2 } from "lucide-react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { AppShell } from "@/components/app/app-shell";
import { ChartCard } from "@/components/app/chart-card";
import { LoadingBlock, ErrorBlock } from "@/components/app/data-states";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { getGreenMetrics } from "@/lib/api/analytics";

export const Route = createFileRoute("/green-computing")({
  head: () => ({
    meta: [
      { title: "Green Computing — GreenPharm" },
      {
        name: "description",
        content:
          "System indicators for medicine waste avoided, paperless reporting, digital transactions and inventory optimisation. Estimated.",
      },
      { property: "og:title", content: "Green Computing — GreenPharm" },
      { property: "og:description", content: "Resource optimisation and paperless workflow indicators." },
    ],
  }),
  component: GreenPage,
});

function GreenPage() {
  const green = useQuery({ queryKey: ["green-metrics"], queryFn: getGreenMetrics });

  if (green.isPending) {
    return (
      <AppShell>
        <LoadingBlock rows={8} />
      </AppShell>
    );
  }
  if (green.isError || !green.data) {
    return (
      <AppShell>
        <ErrorBlock onRetry={() => green.refetch()} />
      </AppShell>
    );
  }

  const g = green.data;

  return (
    <AppShell>
      <PageHeader
        title="Green computing"
        description=""
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Medicine waste avoided (est.)" value={`${g.wasteAvoidedUnits} units`} icon={Recycle} tone="success" />
        <StatCard label="Unnecessary reorders avoided" value={g.reordersAvoided} icon={Leaf} tone="success" />
        <StatCard label="Digital transactions" value={g.digitalTransactions} icon={ServerCog} tone="info" />
        <StatCard label="Paperless reports" value={g.paperlessReports} icon={FileCheck2} tone="info" />
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-none lg:col-span-1">
          <CardHeader>
            <CardTitle className="text-base">Efficiency indicators</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            {[
              ["Inventory optimisation", g.inventoryOptimization],
              ["Storage / resource efficiency", g.storageEfficiency],
            ].map(([label, value]) => (
              <div key={label as string} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">{label as string}</span>
                  <span className="font-semibold">{value as number}%</span>
                </div>
                <Progress value={value as number} />
              </div>
            ))}
            <p className="text-xs text-muted-foreground">
              Near-expiry batches identified early: <strong>{g.earlyExpiryDetections}</strong> (system indicator)
            </p>
          </CardContent>
        </Card>

        <ChartCard
          className="lg:col-span-2"
          title="Monthly waste avoided (estimated)"
          description="Units kept out of disposal through early expiry detection."
        >
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={g.monthly}>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
              <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
              <YAxis stroke="var(--muted-foreground)" fontSize={12} />
              <Tooltip contentStyle={{ fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              <Area
                type="monotone"
                dataKey="wasteAvoided"
                name="Units of waste avoided"
                stroke="var(--success)"
                fill="var(--success)"
                fillOpacity={0.18}
              />
              <Area
                type="monotone"
                dataKey="reordersAvoided"
                name="Reorders avoided"
                stroke="var(--chart-4)"
                fill="var(--chart-4)"
                fillOpacity={0.12}
              />
            </AreaChart>
          </ResponsiveContainer>
        </ChartCard>
      </div>

      <ChartCard
        title="Paperless workflow trend"
        description="Share of inventory activity recorded digitally ."
      >
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={g.paperlessTrend}>
            <CartesianGrid strokeDasharray="3 3" stroke="var(--border)" vertical={false} />
            <XAxis dataKey="label" stroke="var(--muted-foreground)" fontSize={12} />
            <YAxis stroke="var(--muted-foreground)" fontSize={12} />
            <Tooltip contentStyle={{ fontSize: 12 }} />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Line
              type="monotone"
              dataKey="digitalRecords"
              name="Digital records"
              stroke="var(--primary)"
              strokeWidth={2}
            />
            <Line
              type="monotone"
              dataKey="printedRecords"
              name="Printed records"
              stroke="var(--chart-5)"
              strokeWidth={2}
            />
          </LineChart>
        </ResponsiveContainer>
      </ChartCard>
    </AppShell>
  );
}