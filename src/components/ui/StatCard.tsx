import { LucideIcon } from "lucide-react";

type StatCardProps = {
  label: string;
  value: string;
  helper: string;
  icon: LucideIcon;
};

export function StatCard({ label, value, helper, icon: Icon }: StatCardProps) {
  return (
    <article className="panel p-5">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-slate-500">{label}</p>
          <strong className="mt-2 block text-2xl font-bold text-pegasus-navy">{value}</strong>
        </div>
        <span className="rounded-xl bg-pegasus-ice p-3 text-pegasus-primary">
          <Icon size={22} />
        </span>
      </div>
      <p className="mt-4 text-sm text-slate-500">{helper}</p>
    </article>
  );
}
