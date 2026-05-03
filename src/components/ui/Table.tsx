import type { ReactNode } from "react";

type TableProps = {
  headers: string[];
  children: ReactNode;
  minWidth?: string;
};

export function Table({ headers, children, minWidth = "760px" }: TableProps) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-left text-sm" style={{ minWidth }}>
        <thead className="bg-pegasus-surface text-xs uppercase tracking-[0.12em] text-slate-500">
          <tr>
            {headers.map((header) => (
              <th key={header} className="px-6 py-4 font-bold">
                {header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-blue-50">{children}</tbody>
      </table>
    </div>
  );
}
