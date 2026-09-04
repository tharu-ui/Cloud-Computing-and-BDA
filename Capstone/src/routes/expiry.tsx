import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { CalendarClock, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/app/data-states";
import { PageHeader } from "@/components/app/page-header";
import { StatCard } from "@/components/app/stat-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { getExpiryRecords, getMedicines, setExpiryAction } from "@/lib/api/services";
import { daysUntil, formatDate } from "@/lib/domain/medicine-status";
import type { ExpiryAction } from "@/lib/domain/types";

export const Route = createFileRoute("/expiry")({
  head: () => ({
    meta: [
      { title: "Expiry Management — GreenPharm" },
      {
        name: "description",
        content:
          "Identify expired and near-expiry medicine batches at 30, 60 and 90 days, then mark them returned, disposed or for review.",
      },
      { property: "og:title", content: "Expiry Management — GreenPharm" },
      {
        property: "og:description",
        content: "Catch expiry risk early to reduce avoidable medicine waste.",
      },
    ],
  }),
  component: ExpiryPage,
});

type Bucket = "expired" | "30" | "60" | "90";

const ACTION_LABELS: Record<ExpiryAction, string> = {
  none: "No action",
  returned: "Returned",
  disposed: "Disposed",
  review: "Under review",
};

function ExpiryPage() {
  const queryClient = useQueryClient();
  const medicines = useQuery({ queryKey: ["medicines"], queryFn: getMedicines });
  const records = useQuery({ queryKey: ["expiry-records"], queryFn: getExpiryRecords });
  const [bucket, setBucket] = useState<Bucket>("expired");

  const mutation = useMutation({
    mutationFn: ({ id, action }: { id: string; action: ExpiryAction }) =>
      setExpiryAction(id, action),
    onSuccess: (record) => {
      queryClient.invalidateQueries({ queryKey: ["expiry-records"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`Marked as ${ACTION_LABELS[record.action].toLowerCase()}`);
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const all = medicines.data ?? [];
  const counts = {
    expired: all.filter((m) => daysUntil(m.expiryDate) < 0).length,
    "30": all.filter((m) => {
      const d = daysUntil(m.expiryDate);
      return d >= 0 && d <= 30;
    }).length,
    "60": all.filter((m) => {
      const d = daysUntil(m.expiryDate);
      return d > 30 && d <= 60;
    }).length,
    "90": all.filter((m) => {
      const d = daysUntil(m.expiryDate);
      return d > 60 && d <= 90;
    }).length,
  };

  const rows = all.filter((m) => {
    const d = daysUntil(m.expiryDate);
    if (bucket === "expired") return d < 0;
    if (bucket === "30") return d >= 0 && d <= 30;
    if (bucket === "60") return d > 30 && d <= 60;
    return d > 60 && d <= 90;
  });

  const actionFor = (id: string): ExpiryAction =>
    records.data?.find((r) => r.medicineId === id)?.action ?? "none";

  return (
    <AppShell>
      <PageHeader
        title="Expiry management"
        description="Act on expiry risk before stock becomes waste. "
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard label="Expired" value={counts.expired} icon={CalendarClock} tone="danger" />
        <StatCard label="Within 30 days" value={counts["30"]} icon={CalendarClock} tone="warning" />
        <StatCard label="31–60 days" value={counts["60"]} icon={CalendarClock} tone="info" />
        <StatCard label="61–90 days" value={counts["90"]} icon={CalendarClock} />
      </div>

      <Tabs value={bucket} onValueChange={(v) => setBucket(v as Bucket)}>
        <TabsList>
          <TabsTrigger value="expired">Expired ({counts.expired})</TabsTrigger>
          <TabsTrigger value="30">30 days ({counts["30"]})</TabsTrigger>
          <TabsTrigger value="60">60 days ({counts["60"]})</TabsTrigger>
          <TabsTrigger value="90">90 days ({counts["90"]})</TabsTrigger>
        </TabsList>
      </Tabs>

      {medicines.isPending ? (
        <LoadingBlock rows={6} />
      ) : medicines.isError ? (
        <ErrorBlock onRetry={() => medicines.refetch()} />
      ) : rows.length === 0 ? (
        <EmptyBlock
          icon={CheckCircle2}
          title="Nothing in this expiry window"
          description="No batches currently fall into the selected range."
        />
      ) : (
        <Card className="overflow-hidden border-border/70 p-0 shadow-none">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Medicine</TableHead>
                  <TableHead>Batch</TableHead>
                  <TableHead>Expiry</TableHead>
                  <TableHead className="text-right">Days</TableHead>
                  <TableHead className="text-right">Units</TableHead>
                  <TableHead>Recorded action</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((m) => {
                  const days = daysUntil(m.expiryDate);
                  return (
                    <TableRow key={m.id}>
                      <TableCell>
                        <p className="font-medium">{m.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {m.id} · {m.storageLocation}
                        </p>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {m.batchNumber}
                      </TableCell>
                      <TableCell className="text-sm">{formatDate(m.expiryDate)}</TableCell>
                      <TableCell
                        className={`text-right text-sm font-semibold ${
                          days < 0 ? "text-destructive" : "text-foreground"
                        }`}
                      >
                        {days < 0 ? `${Math.abs(days)} overdue` : days}
                      </TableCell>
                      <TableCell className="text-right text-sm">{m.quantity}</TableCell>
                      <TableCell>
                        <Badge variant={actionFor(m.id) === "none" ? "outline" : "secondary"}>
                          {ACTION_LABELS[actionFor(m.id)]}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right whitespace-nowrap">
                        {(["returned", "disposed", "review"] as ExpiryAction[]).map((action) => (
                          <Button
                            key={action}
                            size="sm"
                            variant="ghost"
                            disabled={mutation.isPending}
                            onClick={() => mutation.mutate({ id: m.id, action })}
                          >
                            {ACTION_LABELS[action]}
                          </Button>
                        ))}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}
    </AppShell>
  );
}