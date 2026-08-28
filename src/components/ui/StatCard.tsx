import { ArrowRight, type LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "../../lib/utils";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
  className?: string;
  href?: string;
};

export function StatCard({ label, value, helper, icon: Icon, className, href }: StatCardProps) {
  const inner = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-stone-400">{label}</p>
          <strong className="mt-2 block text-3xl font-black text-pegasus-navy tabular-nums">{value}</strong>
        </div>
        <span className="shrink-0 rounded-xl bg-emerald-50 p-3 text-emerald-600 transition-all duration-200 group-hover:bg-emerald-600 group-hover:text-white">
          <Icon size={22} />
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-stone-100 pt-3.5">
        <p className="truncate text-sm text-stone-500">{helper}</p>
        {href && (
          <ArrowRight
            size={14}
            className="shrink-0 text-stone-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-stone-700"
          />
        )}
      </div>
    </>
  );

  if (href) {
    return (
      <Link
        to={href}
        className={cn(
          "panel group relative block cursor-pointer overflow-hidden p-5",
          "hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-900/5",
          "transition-all duration-200",
          className,
        )}
      >
        {inner}
      </Link>
    );
  }

  return (
    <article
      className={cn(
        "panel group relative cursor-default overflow-hidden p-5",
        "hover:-translate-y-0.5 hover:border-stone-300 hover:shadow-lg hover:shadow-stone-900/5",
        "transition-all duration-200",
        className,
      )}
    >
      {inner}
    </article>
  );
}
