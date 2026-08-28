import type { ReactNode } from "react";
import { LucideIcon } from "lucide-react";

type EmptyStateProps = {
  title: string;
  description: string;
  icon: LucideIcon;
  action?: ReactNode;
};

export function EmptyState({ title, description, icon: Icon, action }: EmptyStateProps) {
  return (
    <div className="rounded-lg border border-dashed border-stone-300 bg-white p-8 text-center">
      <span className="mx-auto grid h-12 w-12 place-items-center rounded-lg bg-pegasus-ice text-pegasus-primary">
        <Icon size={22} />
      </span>
      <h2 className="mt-4 text-lg font-bold text-pegasus-navy">{title}</h2>
      <p className="mx-auto mt-2 max-w-md text-sm leading-6 text-slate-600">{description}</p>
      {action ? <div className="mt-5 flex justify-center">{action}</div> : null}
    </div>
  );
}
