import type { LucideIcon } from "lucide-react";
import { cn } from "../../lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  className?: string;
};

export function StatCard({ label, value, helper, icon: Icon, className }: StatCardProps) {
  return (
    <article
      className={cn(
        "panel group cursor-default p-5",
        "hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <strong className="mt-1.5 block text-2xl font-bold text-pegasus-navy">{value}</strong>
        </div>
        <span className="rounded-xl bg-pegasus-ice p-3 text-pegasus-primary transition-colors duration-150 group-hover:bg-pegasus-primary group-hover:text-white">
          <Icon size={22} />
        </span>
      </div>
      <p className="mt-4 truncate text-sm text-slate-500">{helper}</p>
    </article>
  );
}
