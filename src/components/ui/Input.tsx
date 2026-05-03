import type { InputHTMLAttributes } from "react";

type InputProps = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
};

export function Input({ className = "", label, ...props }: InputProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-pegasus-navy">{label}</span>
      <input
        className={`mt-2 min-h-11 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-pegasus-sky focus:ring-2 focus:ring-blue-100 md:text-sm ${className}`}
        {...props}
      />
    </label>
  );
}
