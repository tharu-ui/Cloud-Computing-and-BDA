import { createFileRoute } from "@tanstack/react-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { BellRing } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { EmptyBlock, ErrorBlock, LoadingBlock } from "@/components/app/data-states";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  getNotifications,
  markAllNotificationsRead,
  markNotificationRead,
} from "@/lib/api/services";
import { formatDateTime } from "@/lib/domain/medicine-status";

export const Route = createFileRoute("/notifications")({
  head: () => ({
    meta: [
      { title: "Notifications — GreenPharm" },
      {
        name: "description",
        content:
          "Central alerts for low stock, expiring and expired medicines, pending purchase orders and unusual stock changes.",
      },
      { property: "og:title", content: "Notifications — GreenPharm" },
      { property: "og:description", content: "Pharmacy inventory alert centre." },
    ],
  }),
  component: NotificationsPage,
});

function NotificationsPage() {
  const queryClient = useQueryClient();
  const notifications = useQuery({ queryKey: ["notifications"], queryFn: getNotifications });
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["notifications"] });

  const readOne = useMutation({ mutationFn: markNotificationRead, onSuccess: invalidate });
  const readAll = useMutation({ mutationFn: markAllNotificationsRead, onSuccess: invalidate });

  const items = notifications.data ?? [];
  const unread = items.filter((n) => !n.read).length;

  return (
    <AppShell>
      <PageHeader
        title="Notifications"
        description={`${unread} unread of ${items.length} alerts`}
        actions={
          <Button variant="outline" onClick={() => readAll.mutate()} disabled={unread === 0}>
            Mark all as read
          </Button>
        }
      />

      {notifications.isPending ? (
        <LoadingBlock rows={5} />
      ) : notifications.isError ? (
        <ErrorBlock onRetry={() => notifications.refetch()} />
      ) : items.length === 0 ? (
        <EmptyBlock icon={BellRing} title="No notifications" />
      ) : (
        <div className="flex flex-col gap-2">
          {items.map((n) => (
            <Card
              key={n.id}
              className={`border-border/70 shadow-none ${n.read ? "opacity-70" : ""}`}
            >
              <CardContent className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3">
                <div className="min-w-0">
                  <div className="flex min-w-0 flex-wrap items-center gap-2">
                    <p className="truncate font-medium text-foreground">{n.title}</p>
                    <Badge variant="outline" className="shrink-0 capitalize">
                      {n.kind.replace("_", " ")}
                    </Badge>
                  </div>
                  <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(n.createdAt)}
                  </p>
                </div>
                {!n.read ? (
                  <Button size="sm" variant="ghost" onClick={() => readOne.mutate(n.id)}>
                    Mark read
                  </Button>
                ) : null}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </AppShell>
  );
}