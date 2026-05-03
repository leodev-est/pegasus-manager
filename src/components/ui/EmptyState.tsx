import { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon: LucideIcon;
};

export function EmptyState({ title, description, icon: Icon }: EmptyStateProps) {
  return (
    <div className="rounded-2xl border border-dashed border-blue-200 bg-white p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-pegasus-ice text-pegasus-primary">
        <Icon size={22} />
      </span>
      <h2 className="mt-4 text-lg font-bold text-pegasus-navy">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
    </div>
  );
}
