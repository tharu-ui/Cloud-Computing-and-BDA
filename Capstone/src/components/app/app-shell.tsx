import { Link, useNavigate, useRouterState } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState, type ReactNode } from "react";
import {
  Bell,
  Boxes,
  CalendarClock,
  FileBarChart,
  LayoutDashboard,
  Leaf,
  LogOut,
  Menu,
  Package,
  Settings,
  ShoppingCart,
  Truck,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { getNotifications } from "@/lib/api/services";
import { ROLE_LABELS } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";

const NAV = [
  {
    to: "/dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    roles: ["pharmacist", "inventory_manager", "administrator"],
  },
  {
    to: "/inventory",
    label: "Inventory",
    icon: Package,
    roles: ["pharmacist", "inventory_manager", "administrator"],
  },
  {
    to: "/stock",
    label: "Stock Management",
    icon: Boxes,
    roles: ["inventory_manager", "administrator"],
  },
  {
    to: "/expiry",
    label: "Expiry Management",
    icon: CalendarClock,
    roles: ["pharmacist", "inventory_manager", "administrator"],
  },
  {
    to: "/suppliers",
    label: "Suppliers",
    icon: Truck,
    roles: ["inventory_manager", "administrator"],
  },
  {
    to: "/purchase-orders",
    label: "Purchase Orders",
    icon: ShoppingCart,
    roles: ["inventory_manager", "administrator"],
  },
  {
    to: "/reports",
    label: "Reports",
    icon: FileBarChart,
    roles: ["administrator"],
  },
  {
    to: "/green-computing",
    label: "Green Computing",
    icon: Leaf,
    roles: ["administrator"],
  },
  {
    to: "/notifications",
    label: "Notifications",
    icon: Bell,
    roles: ["pharmacist", "inventory_manager", "administrator"],
  },
  {
    to: "/settings",
    label: "Settings",
    icon: Settings,
    roles: ["administrator"],
  },
] as const;

export function AppShell({ children }: { children: ReactNode }) {
  const { user, isReady, signOut } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = useRouterState({
    select: (s) => s.location.pathname,
  });

  const currentRole = user?.role;

  const currentNavItem = NAV.find((item) => item.to === pathname);

  const hasPageAccess =
    !currentNavItem ||
    !currentRole ||
    currentNavItem.roles.includes(currentRole);

  const { data: notifications } = useQuery({
    queryKey: ["notifications"],
    queryFn: getNotifications,
  });

  const unread = notifications?.filter((n) => !n.read).length ?? 0;

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (isReady && !user) {
      navigate({ to: "/", replace: true });
    }
  }, [isReady, user, navigate]);

  useEffect(() => {
    if (isReady && user && !hasPageAccess) {
      navigate({ to: "/dashboard", replace: true });
    }
  }, [isReady, user, hasPageAccess, navigate]);

  const nav = (
    <nav className="flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-4">
      {NAV.filter(
        (item) => !currentRole || item.roles.includes(currentRole),
      ).map((item) => {
        const active = pathname === item.to;

        return (
          <Link
            key={item.to}
            to={item.to}
            className={`flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors ${
              active
                ? "bg-sidebar-accent text-sidebar-accent-foreground"
                : "text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
            }`}
          >
            <item.icon
              className="size-4.5 shrink-0"
              aria-hidden
            />

            <span className="truncate">{item.label}</span>

            {item.to === "/notifications" && unread > 0 ? (
              <span className="ml-auto rounded-full bg-sidebar-primary px-1.5 py-0.5 text-xs font-semibold text-sidebar-primary-foreground">
                {unread}
              </span>
            ) : null}
          </Link>
        );
      })}
    </nav>
  );

  const sidebarInner = (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="flex items-center gap-2.5 px-5 py-5">
        <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-sidebar-primary">
          <Leaf
            className="size-5 text-sidebar-primary-foreground"
            aria-hidden
          />
        </span>

        <div className="min-w-0">
          <p className="font-display text-base leading-tight font-semibold text-sidebar-accent-foreground">
            GreenPharm
          </p>

          <p className="truncate text-xs text-sidebar-foreground/70">
            Inventory System
          </p>
        </div>
      </div>

      <Separator className="bg-sidebar-border" />

      {nav}

      <Separator className="bg-sidebar-border" />

      <div className="px-3 py-4">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <span className="grid size-9 shrink-0 place-items-center rounded-full bg-sidebar-accent text-sm font-semibold text-sidebar-accent-foreground">
            {user?.initials ?? "--"}
          </span>

          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-sidebar-accent-foreground">
              {user?.name ?? "Signed out"}
            </p>

            <p className="truncate text-xs text-sidebar-foreground/70">
              {user ? ROLE_LABELS[user.role] : ""}
            </p>
          </div>
        </div>

        <Button
          variant="ghost"
          className="mt-1 w-full justify-start gap-2 text-sidebar-foreground/80 hover:bg-sidebar-accent/60 hover:text-sidebar-accent-foreground"
          onClick={() => {
            signOut();
            navigate({ to: "/", replace: true });
          }}
        >
          <LogOut className="size-4" aria-hidden />
          Log out
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen w-full bg-background">
      <aside className="hidden w-64 shrink-0 border-r border-sidebar-border lg:block">
        <div className="sticky top-0 h-screen">
          {sidebarInner}
        </div>
      </aside>

      {mobileOpen ? (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            aria-label="Close navigation"
            className="absolute inset-0 bg-foreground/40"
            onClick={() => setMobileOpen(false)}
          />

          <div className="relative h-full w-72 max-w-[85%] shadow-xl">
            <Button
              variant="ghost"
              size="icon"
              aria-label="Close navigation"
              className="absolute top-4 right-3 text-sidebar-foreground hover:bg-sidebar-accent"
              onClick={() => setMobileOpen(false)}
            >
              <X className="size-4" aria-hidden />
            </Button>

            {sidebarInner}
          </div>
        </div>
      ) : null}

      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-border bg-card/95 px-4 backdrop-blur">
          <Button
            variant="ghost"
            size="icon"
            className="lg:hidden"
            aria-label="Open navigation"
            onClick={() => setMobileOpen(true)}
          >
            <Menu className="size-5" aria-hidden />
          </Button>

          <p className="min-w-0 truncate text-sm font-medium text-muted-foreground">
            {NAV.find((n) => n.to === pathname)?.label ?? "GreenPharm"}
          </p>

          <div className="ml-auto flex items-center gap-2">
            <Button
              variant="ghost"
              size="icon"
              asChild
              aria-label="Notifications"
            >
              <Link to="/notifications" className="relative">
                <Bell className="size-5" aria-hidden />

                {unread > 0 ? (
                  <span className="absolute -top-0.5 -right-0.5 grid min-w-4 place-items-center rounded-full bg-destructive px-1 text-[10px] font-semibold text-destructive-foreground">
                    {unread}
                  </span>
                ) : null}
              </Link>
            </Button>

            <div className="hidden items-center gap-2 border-l border-border pl-3 sm:flex">
              <span className="grid size-8 place-items-center rounded-full bg-secondary text-xs font-semibold text-secondary-foreground">
                {user?.initials ?? "--"}
              </span>

              <div className="min-w-0">
                <p className="truncate text-xs font-semibold text-foreground">
                  {user?.name}
                </p>

                <p className="truncate text-[11px] text-muted-foreground">
                  {user ? ROLE_LABELS[user.role] : ""}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6">
          <div className="mx-auto flex w-full max-w-7xl flex-col gap-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}