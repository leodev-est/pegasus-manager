import { Edit, Eye, ToggleLeft, Trash2 } from "lucide-react";

type ActionButtonsProps = {
  canEdit: boolean;
  canDelete?: boolean;
  canToggle?: boolean;
  onEdit?: () => void;
  onDelete?: () => void;
  onToggle?: () => void;
  onView?: () => void;
  toggleLabel?: string;
};

export function ActionButtons({
  canDelete,
  canEdit,
  canToggle,
  onDelete,
  onEdit,
  onToggle,
  onView,
  toggleLabel = "Alterar status",
}: ActionButtonsProps) {
  const showDelete = canDelete ?? canEdit;
  const showToggle = canToggle ?? canEdit;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {onView ? (
        <button className="min-h-10 font-bold text-pegasus-primary" onClick={onView} type="button">
          <Eye className="mr-1 inline" size={16} />
          Ver
        </button>
      ) : null}
      {canEdit && onEdit ? (
        <button className="min-h-10 font-bold text-pegasus-primary" onClick={onEdit} type="button">
          <Edit className="mr-1 inline" size={16} />
          Editar
        </button>
      ) : null}
      {showToggle && onToggle ? (
        <button className="min-h-10 font-bold text-amber-700" onClick={onToggle} type="button">
          <ToggleLeft className="mr-1 inline" size={16} />
          {toggleLabel}
        </button>
      ) : null}
      {showDelete && onDelete ? (
        <button className="min-h-10 font-bold text-rose-700" onClick={onDelete} type="button">
          <Trash2 className="mr-1 inline" size={16} />
          Excluir
        </button>
      ) : null}
    </div>
  );
}
