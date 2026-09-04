import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { Eye, EyeOff, Leaf, Loader2, ShieldCheck } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ROLE_LABELS, requestPasswordReset } from "@/lib/api/auth";
import { useAuth } from "@/lib/auth/auth-context";
import type { UserRole } from "@/lib/domain/types";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Sign in — GreenPharm Pharmacy Inventory" },
      {
        name: "description",
        content:
          "Sign in to GreenPharm to manage pharmacy medicines, stock levels, expiry and purchase orders.",
      },
      { property: "og:title", content: "Sign in — GreenPharm Pharmacy Inventory" },
      {
        property: "og:description",
        content: "Role-based access for pharmacists, inventory managers and administrators.",
      },
    ],
  }),
  component: LoginPage,
});

function LoginPage() {
  const { signIn, user, isReady } = useAuth();
  const navigate = useNavigate();
  const [identifier, setIdentifier] = useState("priya.nair@greenpharm.example");
  const [password, setPassword] = useState("greenpharm");
  const [role, setRole] = useState<UserRole>("pharmacist");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [resetEmail, setResetEmail] = useState("");

  useEffect(() => {
    if (isReady && user) navigate({ to: "/dashboard", replace: true });
  }, [isReady, user, navigate]);

  async function handleSubmit(event: React.FormEvent) {
    event.preventDefault();
    setError(null);
    if (!identifier.trim()) {
      setError("Enter your email or username");
      return;
    }
    setSubmitting(true);
    try {
      const signed = await signIn({ identifier: identifier.trim(), password, role }, remember);
      toast.success(`Welcome back, ${signed.name}`);
      navigate({ to: "/dashboard", replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to sign in");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <section className="relative hidden flex-col justify-between bg-sidebar px-10 py-12 lg:flex">
        <div className="flex items-center gap-3">
          <span className="grid size-10 place-items-center rounded-xl bg-sidebar-primary">
            <Leaf className="size-5 text-sidebar-primary-foreground" aria-hidden />
          </span>
          <div>
            <p className="font-display text-lg font-semibold text-sidebar-accent-foreground">
              GreenPharm
            </p>
            <p className="text-xs text-sidebar-foreground/70">Pharmacy Inventory Management</p>
          </div>
        </div>

        <div className="max-w-md">
          <h2 className="font-display text-3xl leading-tight font-semibold text-sidebar-accent-foreground">
            Less waste. Less paper. Full visibility over every batch.
          </h2>
          <p className="mt-4 text-sm leading-relaxed text-sidebar-foreground/80">
            Track stock, expiry windows, suppliers and purchasing in one place — with green
            computing indicators that surface avoidable waste and unnecessary reorders before
            they happen.
          </p>
          <ul className="mt-8 space-y-3 text-sm text-sidebar-foreground/80">
            {[
              "Batch-level expiry monitoring at 30/60/90 days",
              "Reorder suggestions instead of blanket restocking",
              "Paperless reports and digital stock records",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2">
                <ShieldCheck className="mt-0.5 size-4 shrink-0 text-sidebar-primary" aria-hidden />
                {item}
              </li>
            ))}
          </ul>
        </div>

        <p className="text-xs text-sidebar-foreground/60">
        
        </p>
      </section>

      <section className="flex items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-3 lg:hidden">
            <span className="grid size-10 place-items-center rounded-xl bg-primary">
              <Leaf className="size-5 text-primary-foreground" aria-hidden />
            </span>
            <p className="font-display text-lg font-semibold">GreenPharm</p>
          </div>

          <h1 className="text-2xl font-semibold text-foreground">Sign in</h1>
          <p className="mt-1.5 text-sm text-muted-foreground">
            Use your pharmacy account to access the inventory workspace.
          </p>

          <form className="mt-7 space-y-4" onSubmit={handleSubmit} noValidate>
            <div className="space-y-1.5">
              <Label htmlFor="identifier">Email or username</Label>
              <Input
                id="identifier"
                autoComplete="username"
                value={identifier}
                maxLength={120}
                onChange={(e) => setIdentifier(e.target.value)}
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  maxLength={72}
                  className="pr-10"
                  onChange={(e) => setPassword(e.target.value)}
                />
                <button
                  type="button"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute inset-y-0 right-0 grid w-10 place-items-center text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                >
                  {showPassword ? (
                    <EyeOff className="size-4" aria-hidden />
                  ) : (
                    <Eye className="size-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="role">Role</Label>
              <Select value={role} onValueChange={(v) => setRole(v as UserRole)}>
                <SelectTrigger id="role" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(ROLE_LABELS).map(([value, label]) => (
                    <SelectItem key={value} value={value}>
                      {label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="remember"
                  checked={remember}
                  onCheckedChange={(v) => setRemember(v === true)}
                />
                <Label htmlFor="remember" className="text-sm font-normal">
                  Remember me
                </Label>
              </div>
              <button
                type="button"
                className="text-sm font-medium text-primary hover:underline"
                onClick={() => setForgotOpen(true)}
              >
                Forgot password?
              </button>
            </div>

            {error ? (
              <p role="alert" className="text-sm font-medium text-destructive">
                {error}
              </p>
            ) : null}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? <Loader2 className="size-4 animate-spin" aria-hidden /> : null}
              {submitting ? "Signing in…" : "Login"}
            </Button>
          </form>

          <p className="mt-6 rounded-md bg-secondary px-3 py-2.5 text-xs text-secondary-foreground">
            Password must be of 4+ characters . Choose your role.
            
          </p>
        </div>
      </section>

      <Dialog open={forgotOpen} onOpenChange={setForgotOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset your password</DialogTitle>
            <DialogDescription>
              We'll send a reset link to your pharmacy email address.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1.5">
            <Label htmlFor="reset-email">Email address</Label>
            <Input
              id="reset-email"
              type="email"
              value={resetEmail}
              maxLength={120}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setForgotOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={async () => {
                try {
                  await requestPasswordReset(resetEmail.trim());
                  toast.success("Reset link sent (sample behaviour)");
                  setForgotOpen(false);
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : "Could not send reset link");
                }
              }}
            >
              Send link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}