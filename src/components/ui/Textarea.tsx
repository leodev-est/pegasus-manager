import type { TextareaHTMLAttributes } from "react";

type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function Textarea({ className = "", label, rows = 4, ...props }: TextareaProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-pegasus-navy">{label}</span>
      <textarea
        className={`mt-2 w-full resize-y rounded-2xl border border-blue-100 bg-white px-4 py-3 text-base outline-none transition placeholder:text-slate-400 focus:border-pegasus-sky focus:ring-2 focus:ring-blue-100 md:text-sm ${className}`}
        rows={rows}
        {...props}
      />
    </label>
  );
}
