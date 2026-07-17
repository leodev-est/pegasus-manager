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
      <span className="pointer-events-none absolute inset-x-0 top-0 h-[2px] bg-gradient-to-r from-pegasus-sky via-pegasus-primary to-pegasus-medium opacity-50 transition-opacity duration-200 group-hover:opacity-100" />
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <strong className="mt-2 block text-3xl font-black text-pegasus-navy">{value}</strong>
        </div>
        <span className="shrink-0 rounded-xl bg-gradient-to-br from-pegasus-sky/20 to-pegasus-primary/10 p-3 text-pegasus-primary transition-all duration-200 group-hover:from-pegasus-primary group-hover:to-pegasus-medium group-hover:text-white">
          <Icon size={22} />
        </span>
      </div>
      <div className="mt-4 flex items-center justify-between gap-2 border-t border-slate-100 pt-3.5">
        <p className="truncate text-sm text-slate-500">{helper}</p>
        {href && (
          <ArrowRight
            size={14}
            className="shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-pegasus-primary"
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
          "hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/8",
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
        "hover:-translate-y-0.5 hover:border-blue-200 hover:shadow-lg hover:shadow-blue-900/8",
        "transition-all duration-200",
        className,
      )}
    >
      {inner}
    </article>
  );
}
