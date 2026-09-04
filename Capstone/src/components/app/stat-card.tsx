import type { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

type Tone = "default" | "success" | "warning" | "danger" | "info";

const TONES: Record<Tone, string> = {
  default: "bg-secondary text-secondary-foreground",
  success: "bg-success/12 text-success",
  warning: "bg-warning/18 text-warning-foreground",
  danger: "bg-destructive/12 text-destructive",
  info: "bg-info/12 text-info",
};

export function StatCard({
  label,
  value,
  hint,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  icon: LucideIcon;
  tone?: Tone;
}) {
  return (
    <Card className="gap-0 border-border/70 py-4 shadow-none transition-colors hover:border-primary/30">
      <CardContent className="px-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium tracking-wide text-muted-foreground uppercase">
              {label}
            </p>
            <p className="mt-2 font-display text-2xl leading-none font-semibold text-foreground">
              {value}
            </p>
            {hint ? <p className="mt-1.5 text-xs text-muted-foreground">{hint}</p> : null}
          </div>
          <span className={`grid size-9 shrink-0 place-items-center rounded-lg ${TONES[tone]}`}>
            <Icon className="size-4.5" aria-hidden />
          </span>
        </div>
      </CardContent>
    </Card>
  );
}