import type { SelectHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Array<{ label: string; value: string }>;
};

export function Select({ className, label, options, ...props }: SelectProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <select
        className={cn(
          "h-11 w-full rounded-xl border border-slate-200 bg-white px-3.5 text-sm text-slate-900",
          "outline-none transition-all duration-150 cursor-pointer",
          "hover:border-slate-300",
          "focus:border-pegasus-sky focus:ring-2 focus:ring-pegasus-sky/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>
    </label>
  );
}
