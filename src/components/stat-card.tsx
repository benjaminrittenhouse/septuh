import { cn } from "@/lib/utils";

interface StatCardProps {
  label: string;
  value: string | number;
  sub?: string;
  variant?: "default" | "red" | "green" | "yellow" | "blue";
}

const valueClass = {
  default: "text-foreground",
  red:    "text-red-600",
  green:  "text-emerald-600",
  yellow: "text-amber-600",
  blue:   "text-[#0057a8]",
};

const accentClass = {
  default: "bg-neutral-400",
  red:    "bg-[#e8192c]",
  green:  "bg-emerald-500",
  yellow: "bg-amber-500",
  blue:   "bg-[#0057a8]",
};

export function StatCard({ label, value, sub, variant = "default" }: StatCardProps) {
  return (
    <div className="relative bg-card border border-border rounded-sm overflow-hidden flex flex-col shadow-sm">
      <div className={cn("absolute left-0 top-0 bottom-0 w-[3px]", accentClass[variant])} />
      <div className="pl-4 pr-4 pt-3 pb-3">
        <p className="text-[10px] font-semibold uppercase tracking-[0.12em] text-muted-foreground mb-1">
          {label}
        </p>
        <p className={cn("text-3xl font-bold tabular-nums font-mono", valueClass[variant])}>
          {value}
        </p>
        {sub && (
          <p className="text-[11px] text-muted-foreground mt-1">{sub}</p>
        )}
      </div>
    </div>
  );
}
