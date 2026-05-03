import type { ReactNode } from "react";
import { X } from "lucide-react";

type ModalProps = {
  title: string;
  description?: string;
  isOpen: boolean;
  onClose: () => void;
  children: ReactNode;
};

export function Modal({ title, description, isOpen, onClose, children }: ModalProps) {
  if (!isOpen) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-pegasus-navy/60 px-2 py-3 backdrop-blur-sm sm:px-4 sm:py-6">
      <section className="max-h-[96vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl sm:max-h-[92vh] sm:rounded-3xl">
        <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-blue-100 bg-white px-4 py-4 sm:px-6 sm:py-5">
          <div>
            <h2 className="text-xl font-black text-pegasus-navy">{title}</h2>
            {description ? <p className="mt-1 text-sm text-slate-500">{description}</p> : null}
          </div>
          <button
            aria-label="Fechar"
            className="focus-ring grid h-10 w-10 place-items-center rounded-full bg-pegasus-ice text-pegasus-primary"
            onClick={onClose}
            type="button"
          >
            <X size={18} />
          </button>
        </header>
        <div className="p-4 sm:p-6">{children}</div>
      </section>
    </div>
  );
}
