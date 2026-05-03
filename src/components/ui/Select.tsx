import type { SelectHTMLAttributes } from "react";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
  options: Array<{ label: string; value: string }>;
};

export function Select({ className = "", label, options, ...props }: SelectProps) {
  return (
    <label className="block">
      <span className="text-sm font-bold text-pegasus-navy">{label}</span>
      <select
        className={`mt-2 min-h-11 w-full rounded-2xl border border-blue-100 bg-white px-4 py-3 text-base outline-none transition focus:border-pegasus-sky focus:ring-2 focus:ring-blue-100 md:text-sm ${className}`}
        {...props}
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}
