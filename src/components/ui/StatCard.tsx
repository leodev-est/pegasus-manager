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
  const content = (
    <div className="flex items-start justify-between gap-4">
      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">{label}</p>
        <strong className="mt-1.5 block text-2xl font-bold text-pegasus-navy">{value}</strong>
      </div>
      <span className="rounded-md bg-pegasus-ice p-3 text-pegasus-primary transition-colors duration-150 group-hover:bg-pegasus-primary group-hover:text-white">
        <Icon size={22} />
      </span>
    </div>
  );

  const footer = (
    <div className="mt-4 flex items-center justify-between gap-2">
      <p className="truncate text-sm text-slate-500">{helper}</p>
      {href && (
        <ArrowRight
          size={14}
          className="shrink-0 text-slate-400 transition-transform duration-150 group-hover:translate-x-0.5 group-hover:text-pegasus-primary"
        />
      )}
    </div>
  );

  if (href) {
    return (
      <Link
        to={href}
        className={cn(
          "panel group block cursor-pointer p-5",
          "hover:-translate-y-0.5 hover:shadow-md hover:border-pegasus-sky/40",
          "transition-all duration-150",
          className,
        )}
      >
        {content}
        {footer}
      </Link>
    );
  }

  return (
    <article
      className={cn(
        "panel group cursor-default p-5",
        "hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      {content}
      {footer}
    </article>
  );
}
