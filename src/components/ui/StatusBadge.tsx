export type StatusTone = "success" | "warning" | "info" | "neutral" | "danger";

type StatusBadgeProps = {
  label: string;
  tone?: StatusTone;
};

const toneMap = {
  success: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  warning: "bg-amber-50 text-amber-700 ring-amber-200",
  info: "bg-blue-50 text-blue-700 ring-blue-200",
  neutral: "bg-slate-50 text-slate-700 ring-slate-200",
  danger: "bg-rose-50 text-rose-700 ring-rose-200",
};

export function StatusBadge({ label, tone = "neutral" }: StatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold ring-1 ${toneMap[tone]}`}
    >
      {label}
    </span>
  );
}
