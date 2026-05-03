import { AlertTriangle } from "lucide-react";
import { Button } from "./Button";
import { Modal } from "./Modal";

type ConfirmDialogProps = {
  isOpen: boolean;
  title: string;
  description: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onClose: () => void;
};

export function ConfirmDialog({
  confirmLabel = "Confirmar",
  description,
  isOpen,
  onClose,
  onConfirm,
  title,
}: ConfirmDialogProps) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title}>
      <div className="flex gap-4">
        <span className="grid h-12 w-12 shrink-0 place-items-center rounded-2xl bg-rose-50 text-rose-600">
          <AlertTriangle size={22} />
        </span>
        <div>
          <p className="text-sm leading-6 text-slate-600">{description}</p>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row">
            <Button onClick={onConfirm} variant="danger">
              {confirmLabel}
            </Button>
            <Button onClick={onClose} variant="secondary">
              Cancelar
            </Button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
