import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { Boxes, History, Minus, Plus, SlidersHorizontal } from "lucide-react";
import { toast } from "sonner";
import { AppShell } from "@/components/app/app-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/app/data-states";
import { PageHeader } from "@/components/app/page-header";
import { StockStatusBadge } from "@/components/app/status-badge";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  createStockTransaction,
  getMedicines,
  getReorderSuggestions,
  getStockTransactions,
} from "@/lib/api/services";
import { useAuth } from "@/lib/auth/auth-context";
import { formatDateTime, getStockStatus } from "@/lib/domain/medicine-status";
import type { TransactionType } from "@/lib/domain/types";

export const Route = createFileRoute("/stock")({
  head: () => ({
    meta: [
      { title: "Stock Management — GreenPharm" },
      {
        name: "description",
        content:
          "Add, remove and adjust pharmacy stock, review the full movement history and act on low-stock alerts and reorder suggestions.",
      },
      { property: "og:title", content: "Stock Management — GreenPharm" },
      {
        property: "og:description",
        content: "Recorded stock movements with reasons, users and timestamps.",
      },
    ],
  }),
  component: StockPage,
});

function StockPage() {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const medicines = useQuery({ queryKey: ["medicines"], queryFn: getMedicines });
  const transactions = useQuery({
    queryKey: ["stock-transactions"],
    queryFn: () => getStockTransactions(),
  });
  const suggestions = useQuery({
    queryKey: ["reorder-suggestions"],
    queryFn: getReorderSuggestions,
  });

  const [medicineId, setMedicineId] = useState("");
  const [type, setType] = useState<TransactionType>("add");
  const [quantity, setQuantity] = useState(10);
  const [reason, setReason] = useState("");

  const mutation = useMutation({
    mutationFn: createStockTransaction,
    onSuccess: (tx) => {
      queryClient.invalidateQueries({ queryKey: ["stock-transactions"] });
      queryClient.invalidateQueries({ queryKey: ["medicines"] });
      queryClient.invalidateQueries({ queryKey: ["reorder-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard"] });
      toast.success(`${tx.medicineName}: ${tx.quantity > 0 ? "+" : ""}${tx.quantity} units`);
      setReason("");
    },
    onError: (error: Error) => toast.error(error.message),
  });

  const lowStock = (medicines.data ?? []).filter((m) => {
    const status = getStockStatus(m);
    return status === "low_stock" || status === "out_of_stock";
  });

  function submit(event: React.FormEvent) {
    event.preventDefault();
    if (!medicineId) {
      toast.error("Select a medicine");
      return;
    }
    if (!reason.trim()) {
      toast.error("Add a reason for the movement");
      return;
    }
    mutation.mutate({
      medicineId,
      type,
      quantity,
      reason: reason.trim(),
      user: user?.name ?? "System",
    });
  }

  return (
    <AppShell>
      <PageHeader
        title="Stock management"
        description="Record every movement so stock levels and waste indicators stay accurate."
      />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,380px)_minmax(0,1fr)]">
        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Record stock movement</CardTitle>
            <CardDescription>
              Adjustments accept negative values; add and remove use absolute quantities.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form className="space-y-4" onSubmit={submit} noValidate>
              <div className="space-y-1.5">
                <Label htmlFor="s-medicine">Medicine</Label>
                <Select value={medicineId} onValueChange={setMedicineId}>
                  <SelectTrigger id="s-medicine" className="w-full">
                    <SelectValue placeholder="Select medicine" />
                  </SelectTrigger>
                  <SelectContent>
                    {(medicines.data ?? []).map((m) => (
                      <SelectItem key={m.id} value={m.id}>
                        {m.name} · {m.quantity} in stock
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Transaction type</Label>
                <div className="grid grid-cols-3 gap-2">
                  {(
                    [
                      ["add", "Add", Plus],
                      ["remove", "Remove", Minus],
                      ["adjust", "Adjust", SlidersHorizontal],
                    ] as const
                  ).map(([value, label, Icon]) => (
                    <Button
                      key={value}
                      type="button"
                      variant={type === value ? "default" : "outline"}
                      onClick={() => setType(value)}
                    >
                      <Icon className="size-4" aria-hidden /> {label}
                    </Button>
                  ))}
                </div>
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="s-qty">Quantity</Label>
                <Input
                  id="s-qty"
                  type="number"
                  value={quantity}
                  onChange={(e) => setQuantity(Number(e.target.value))}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="s-reason">Reason</Label>
                <Textarea
                  id="s-reason"
                  rows={3}
                  maxLength={200}
                  value={reason}
                  placeholder="e.g. Purchase order PO-1049 received"
                  onChange={(e) => setReason(e.target.value)}
                />
              </div>

              <p className="text-xs text-muted-foreground">
                Recorded as {user?.name ?? "System"} · digital record, no paperwork.
              </p>

              <Button type="submit" className="w-full" disabled={mutation.isPending}>
                Record transaction
              </Button>
            </form>
          </CardContent>
        </Card>

        <div className="flex flex-col gap-4">
          <Card className="border-border/70 shadow-none">
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Low-stock alerts & reorder suggestions</CardTitle>
              <CardDescription>
                Suggested quantities target twice the reorder level to avoid repeat orders.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {suggestions.isPending ? (
                <LoadingBlock rows={3} />
              ) : lowStock.length === 0 ? (
                <EmptyBlock icon={Boxes} title="All items above reorder level" />
              ) : (
                <ul className="divide-y divide-border">
                  {(suggestions.data ?? []).map((s) => (
                    <li
                      key={s.medicine.id}
                      className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-3 py-2.5"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{s.medicine.name}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {s.medicine.quantity} in stock · reorder at {s.medicine.reorderLevel} ·{" "}
                          {s.supplierName}
                        </p>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <StockStatusBadge status={getStockStatus(s.medicine)} />
                        <Badge variant="secondary">Order {s.suggestedQuantity}</Badge>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card className="border-border/70 p-0 shadow-none">
            <CardHeader className="px-6 pt-6 pb-3">
              <CardTitle className="text-base">Stock history</CardTitle>
              <CardDescription>Every recorded transaction, newest first.</CardDescription>
            </CardHeader>
            <CardContent className="px-0 pb-0">
              {transactions.isPending ? (
                <div className="px-6 pb-6">
                  <LoadingBlock rows={6} />
                </div>
              ) : transactions.isError ? (
                <div className="px-6 pb-6">
                  <ErrorBlock onRetry={() => transactions.refetch()} />
                </div>
              ) : (transactions.data ?? []).length === 0 ? (
                <div className="px-6 pb-6">
                  <EmptyBlock icon={History} title="No stock movements recorded yet" />
                </div>
              ) : (
                <div className="max-h-[420px] overflow-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Transaction</TableHead>
                        <TableHead>Medicine</TableHead>
                        <TableHead>Type</TableHead>
                        <TableHead className="text-right">Qty</TableHead>
                        <TableHead>Date/time</TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Reason</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {(transactions.data ?? []).map((t) => (
                        <TableRow key={t.id}>
                          <TableCell className="text-xs font-medium">{t.id}</TableCell>
                          <TableCell className="text-sm">{t.medicineName}</TableCell>
                          <TableCell className="text-sm capitalize">{t.type}</TableCell>
                          <TableCell
                            className={`text-right text-sm font-medium ${
                              t.quantity < 0 ? "text-destructive" : "text-success"
                            }`}
                          >
                            {t.quantity > 0 ? "+" : ""}
                            {t.quantity}
                          </TableCell>
                          <TableCell className="text-xs whitespace-nowrap text-muted-foreground">
                            {formatDateTime(t.createdAt)}
                          </TableCell>
                          <TableCell className="text-sm text-muted-foreground">{t.user}</TableCell>
                          <TableCell className="max-w-[220px] truncate text-sm text-muted-foreground">
                            {t.reason}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </AppShell>
  );
}