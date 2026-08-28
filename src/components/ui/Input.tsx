import { useId, type InputHTMLAttributes } from "react";
import { cn } from "../../lib/utils";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  error?: string;
};

export function Input({ className, label, error, id, ...props }: InputProps) {
  const generatedId = useId();
  const inputId = id ?? generatedId;
  const errorId = `${inputId}-error`;

  return (
    <label className="block" htmlFor={inputId}>
      <span className="mb-1.5 block text-sm font-semibold text-slate-700 dark:text-slate-200">
        {label}
      </span>
      <input
        id={inputId}
        aria-describedby={error ? errorId : undefined}
        aria-invalid={error ? true : undefined}
        className={cn(
          "h-11 w-full rounded-md border border-slate-200 bg-white px-3.5 text-sm text-slate-900",
          "placeholder:text-slate-400",
          "outline-none transition-all duration-150",
          "hover:border-slate-300",
          "focus:border-pegasus-sky focus:ring-2 focus:ring-pegasus-sky/20",
          "disabled:cursor-not-allowed disabled:opacity-50",
          error && "border-rose-400 focus:border-rose-500 focus:ring-rose-500/20",
          className,
        )}
        {...props}
      />
      {error ? (
        <p id={errorId} role="alert" className="mt-1.5 text-xs font-semibold text-rose-600">
          {error}
        </p>
      ) : null}
    </label>
  );
}
