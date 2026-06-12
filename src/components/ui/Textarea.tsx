import type { TextareaHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function Textarea({ className, label, rows = 4, ...props }: TextareaProps) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <textarea
        rows={rows}
        className={cn(
          "w-full resize-y rounded-md border border-slate-200 bg-white px-3.5 py-3 text-sm text-slate-900",
          "placeholder:text-slate-400",
          "outline-none transition-all duration-150",
          "hover:border-slate-300",
          "focus:border-pegasus-sky focus:ring-2 focus:ring-pegasus-sky/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          className,
        )}
        {...props}
      />
    </label>
  );
}
