import { useEffect, useState } from "react";
import { createFileRoute } from "@tanstack/react-router";
import { toast } from "sonner";
import { Leaf, LogOut, ShieldCheck, User2 } from "lucide-react";
import { AppShell } from "@/components/app/app-shell";
import { PageHeader } from "@/components/app/page-header";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ROLE_LABELS } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";

export const Route = createFileRoute("/settings")({
  head: () => ({
    meta: [
      { title: "Settings — GreenPharm Inventory" },
      {
        name: "description",
        content:
          "Manage your GreenPharm profile, pharmacy details, alert thresholds, paperless preferences and session.",
      },
      { property: "og:title", content: "Settings — GreenPharm Inventory" },
      {
        property: "og:description",
        content: "Profile, pharmacy, alert threshold and paperless workflow preferences.",
      },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: SettingsPage,
});

function SettingsPage() {
  const { user, signOut } = useAuth();

  const [profile, setProfile] = useState({
    name: user?.name ?? "Priya Nair",
    email: user?.email ?? "priya.nair@greenpharm.example",
    phone: "+1 415 555 0102",
  });

  useEffect(() => {
    if (!user) return;
    setProfile((current) => ({ ...current, name: user.name, email: user.email }));
  }, [user]);

  const [pharmacy, setPharmacy] = useState({
    name: "GreenPharm Central Pharmacy",
    license: "PH-2026-04482",
    address: "120 Riverside Avenue, Portland, OR 97204",
    currency: "INR",
  });
  const [thresholds, setThresholds] = useState({
    lowStockBuffer: "10",
    expiryWindow: "30",
    reorderLeadDays: "7",
  });
  const [prefs, setPrefs] = useState({
    lowStockAlerts: true,
    expiryAlerts: true,
    orderAlerts: true,
    paperlessReports: true,
    compactTables: false,
  });

  return (
    <AppShell>
      <PageHeader
        title="Settings"
        description=""
        actions={
          <Button onClick={() => toast.success("Settings saved")}>
            Save changes
          </Button>
        }
      />

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="border-border/70 shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <User2 className="size-4" aria-hidden /> Profile
            </CardTitle>
            <CardDescription>Details shown across the app header and audit trails.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="profile-name">Full name</Label>
              <Input
                id="profile-name"
                value={profile.name}
                onChange={(e) => setProfile({ ...profile, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-email">Email</Label>
              <Input
                id="profile-email"
                type="email"
                value={profile.email}
                onChange={(e) => setProfile({ ...profile, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="profile-phone">Phone</Label>
              <Input
                id="profile-phone"
                value={profile.phone}
                onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label>Current role</Label>
              <div className="flex h-9 items-center">
                <Badge variant="outline" className="gap-1.5 font-medium">
                  <ShieldCheck className="size-3.5" aria-hidden />
                  {user ? ROLE_LABELS[user.role] : "Pharmacist"}
                </Badge>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Session</CardTitle>
            <CardDescription></CardDescription>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">User ID</span>
              <span className="font-medium">{user?.id ?? "USR-101"}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">Data source</span>
              <span className="font-medium"></span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-muted-foreground">API layer</span>
              <span className="font-medium">REST client</span>
            </div>
            <Separator />
            <Button variant="outline" className="w-full" onClick={signOut}>
              <LogOut className="size-4" aria-hidden /> Sign out
            </Button>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Pharmacy details</CardTitle>
            <CardDescription>Used on reports and purchase order documents.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="pharmacy-name">Pharmacy name</Label>
              <Input
                id="pharmacy-name"
                value={pharmacy.name}
                onChange={(e) => setPharmacy({ ...pharmacy, name: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pharmacy-license">License number</Label>
              <Input
                id="pharmacy-license"
                value={pharmacy.license}
                onChange={(e) => setPharmacy({ ...pharmacy, license: e.target.value })}
              />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="pharmacy-address">Address</Label>
              <Input
                id="pharmacy-address"
                value={pharmacy.address}
                onChange={(e) => setPharmacy({ ...pharmacy, address: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="pharmacy-currency">Currency</Label>
              <Select
                value={pharmacy.currency}
                onValueChange={(currency) => setPharmacy({ ...pharmacy, currency })}
              >
                <SelectTrigger id="pharmacy-currency">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["INR", "EUR", "GBP", "INR"].map((c) => (
                    <SelectItem key={c} value={c}>
                      {c}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none">
          <CardHeader>
            <CardTitle className="text-base">Alert thresholds</CardTitle>
            <CardDescription>Drive low-stock and expiry notifications.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {(
              [
                ["lowStockBuffer", "Low stock buffer (%)"],
                ["expiryWindow", "Expiry alert window (days)"],
                ["reorderLeadDays", "Reorder lead time (days)"],
              ] as const
            ).map(([key, label]) => (
              <div key={key} className="space-y-2">
                <Label htmlFor={key}>{label}</Label>
                <Input
                  id={key}
                  type="number"
                  min={0}
                  value={thresholds[key]}
                  onChange={(e) => setThresholds({ ...thresholds, [key]: e.target.value })}
                />
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="border-border/70 shadow-none lg:col-span-3">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Leaf className="size-4" aria-hidden /> Notifications & green preferences
            </CardTitle>
            <CardDescription>
              Paperless options reduce printed output — labelled as system indicators only.
            </CardDescription>
          </CardHeader>
          <CardContent className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {(
              [
                ["lowStockAlerts", "Low stock alerts", "Notify when stock reaches reorder level"],
                ["expiryAlerts", "Expiry alerts", "Notify for expired and near-expiry batches"],
                ["orderAlerts", "Purchase order alerts", "Notify on pending and overdue orders"],
                [
                  "paperlessReports",
                  "Paperless reports",
                  "Prefer on-screen reports over printing",
                ],
                ["compactTables", "Compact tables", "Denser rows to reduce scrolling"],
              ] as const
            ).map(([key, label, hint]) => (
              <label
                key={key}
                className="flex items-start justify-between gap-4 rounded-lg border border-border/70 p-3"
              >
                <span className="min-w-0">
                  <span className="block text-sm font-medium text-foreground">{label}</span>
                  <span className="mt-1 block text-xs text-muted-foreground">{hint}</span>
                </span>
                <Switch
                  checked={prefs[key]}
                  onCheckedChange={(checked) => setPrefs({ ...prefs, [key]: checked })}
                />
              </label>
            ))}
          </CardContent>
        </Card>
      </div>
    </AppShell>
  );
}