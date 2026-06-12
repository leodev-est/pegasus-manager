import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "../../lib/utils";

export type StatusTone = "success" | "warning" | "info" | "neutral" | "danger";

const badgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded px-2.5 py-1 text-xs font-semibold ring-1 ring-inset",
  {
    variants: {
      tone: {
        success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
        warning: "bg-amber-50 text-amber-700 ring-amber-200",
        info:    "bg-blue-50 text-blue-700 ring-blue-200",
        neutral: "bg-slate-50 text-slate-600 ring-slate-200",
        danger:  "bg-rose-50 text-rose-700 ring-rose-200",
      },
    },
    defaultVariants: { tone: "neutral" },
  },
);

const dotColors: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  info:    "bg-blue-500",
  neutral: "bg-slate-400",
  danger:  "bg-rose-500",
};

type StatusBadgeProps = VariantProps<typeof badgeVariants> & {
  label: string;
  className?: string;
};

export function StatusBadge({ label, tone = "neutral", className }: StatusBadgeProps) {
  return (
    <span className={cn(badgeVariants({ tone }), className)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", dotColors[tone ?? "neutral"])} />
      {label}
    </span>
  );
}
