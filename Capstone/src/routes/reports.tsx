import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Download, FileText } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/app/data-states";
import { PageHeader } from "@/components/app/page-header";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { REPORT_OPTIONS, getReport, type ReportId } from "@/lib/api/analytics";
import { getCategories } from "@/lib/api/services";
import { formatDateTime } from "@/lib/domain/medicine-status";

export const Route = createFileRoute("/reports")({
  head: () => ({
    meta: [
      { title: "Reports — GreenPharm" },
      {
        name: "description",
        content:
          "Generate inventory, low-stock, expiry, stock movement, purchase, supplier and medicine waste reports with date and category filters.",
      },
      { property: "og:title", content: "Reports — GreenPharm" },
      { property: "og:description", content: "Paperless pharmacy inventory reporting." },
    ],
  }),
  component: ReportsPage,
});

function ReportsPage() {
  const [reportId, setReportId] = useState<ReportId>(REPORT_OPTIONS[0]!.id);
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [category, setCategory] = useState("all");

  const categories = useQuery({ queryKey: ["categories"], queryFn: getCategories });
  const report = useQuery({
    queryKey: ["report", reportId, from, to, category],
    queryFn: () =>
      getReport(reportId, {
        ...(from ? { from } : {}),
        ...(to ? { to } : {}),
        ...(category === "all" ? {} : { category }),
      }),
  });

  const active = REPORT_OPTIONS.find((r) => r.id === reportId);

  return (
    <AppShell>
      <PageHeader
        title="Reports"
        description="All reports are generated digitally — no printing required. "
        actions={
          <Button
            variant="outline"
            onClick={() =>
              toast.success("Export queued (sample behaviour)", {
                description: "Real CSV/PDF export will be handled by the FastAPI backend.",
              })
            }
          >
            <Download className="size-4" aria-hidden /> Export
          </Button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4">
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="r-type">Report</Label>
          <Select value={reportId} onValueChange={(v) => setReportId(v as ReportId)}>
            <SelectTrigger id="r-type" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {REPORT_OPTIONS.map((r) => (
                <SelectItem key={r.id} value={r.id}>
                  {r.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-from">From</Label>
          <Input id="r-from" type="date" value={from} onChange={(e) => setFrom(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="r-to">To</Label>
          <Input id="r-to" type="date" value={to} onChange={(e) => setTo(e.target.value)} />
        </div>
        <div className="space-y-1.5 md:col-span-2">
          <Label htmlFor="r-cat">Category</Label>
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger id="r-cat" className="w-full">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {(categories.data ?? []).map((c) => (
                <SelectItem key={c} value={c}>
                  {c}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <p className="text-sm text-muted-foreground">{active?.description}</p>

      {report.isPending ? (
        <LoadingBlock rows={6} />
      ) : report.isError ? (
        <ErrorBlock onRetry={() => report.refetch()} />
      ) : (report.data?.rows.length ?? 0) === 0 ? (
        <EmptyBlock
          icon={FileText}
          title="No rows for these filters"
          description="Try widening the date range or clearing the category filter."
        />
      ) : (
        <Card className="overflow-hidden border-border/70 p-0 shadow-none">
          <div className="max-h-[520px] overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {report.data!.columns.map((c) => (
                    <TableHead key={c.key}>{c.label}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {report.data!.rows.map((row, index) => (
                  <TableRow key={index}>
                    {report.data!.columns.map((c) => (
                      <TableCell key={c.key} className="text-sm">
                        {row[c.key] ?? "—"}
                      </TableCell>
                    ))}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </Card>
      )}

      {report.data ? (
        <p className="text-xs text-muted-foreground">
          {report.data.rows.length} rows · generated {formatDateTime(report.data.generatedAt)}
        </p>
      ) : null}
    </AppShell>
  );
}