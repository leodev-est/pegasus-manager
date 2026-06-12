import type { ReactNode } from "react";

type FilterBarProps = {
  children: ReactNode;
};

export function FilterBar({ children }: FilterBarProps) {
  return (
    <section className="grid gap-4 rounded-lg border border-blue-100 bg-white p-4 shadow-sm md:grid-cols-2 xl:grid-cols-4">
      {children}
    </section>
  );
}
