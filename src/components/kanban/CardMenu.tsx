import {
  Archive,
  ArchiveRestore,
  ArrowRightLeft,
  CalendarDays,
  ChevronRight,
  Copy,
  Ellipsis,
  UserMinus,
  UserPlus,
} from "lucide-react";
import type { KeyboardEvent as ReactKeyboardEvent, ReactNode } from "react";
import { useEffect, useId, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";

export type CardMenuColumn = { label: string; value: string; disabled: boolean };

type CardMenuProps = {
  title: string;
  isMine: boolean;
  isArchived: boolean;
  /** Archived automatically (old published card): there is nothing to restore. */
  isAutoArchived: boolean;
  minDueDate?: string;
  columns: CardMenuColumn[];
  onAssignToggle?: () => void;
  onDueChange?: (dueDate: string | null) => void;
  onMove?: (status: string) => void;
  onDuplicate?: () => void;
  onArchive?: (archived: boolean) => void;
  onOpenChange?: (open: boolean) => void;
};

function dateKeyFromToday(days: number) {
  const date = new Date();
  date.setDate(date.getDate() + days);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
}

/** Stops dnd-kit (listeners on the card) from treating presses inside the menu as a drag. */
const stopDrag = {
  onPointerDown: (event: { stopPropagation: () => void }) => event.stopPropagation(),
  onTouchStart: (event: { stopPropagation: () => void }) => event.stopPropagation(),
};

function MenuItem({
  children,
  disabled,
  expanded,
  icon,
  onSelect,
}: {
  children: ReactNode;
  disabled?: boolean;
  expanded?: boolean;
  icon?: ReactNode;
  onSelect: () => void;
}) {
  return (
    <button
      aria-expanded={expanded}
      className="flex w-full items-center gap-2.5 rounded-md px-2.5 py-2 text-left text-sm font-semibold text-slate-700 transition-colors hover:bg-pegasus-surface focus:bg-pegasus-surface focus:outline-none disabled:cursor-not-allowed disabled:opacity-40 dark:text-slate-200 dark:hover:bg-slate-700 dark:focus:bg-slate-700"
      disabled={disabled}
      onClick={onSelect}
      role="menuitem"
      tabIndex={-1}
      type="button"
    >
      {icon ? <span className="shrink-0 text-stone-400">{icon}</span> : null}
      <span className="min-w-0 flex-1">{children}</span>
      {expanded !== undefined ? (
        <ChevronRight
          aria-hidden="true"
          className={`shrink-0 text-stone-400 transition-transform ${expanded ? "rotate-90" : ""}`}
          size={14}
        />
      ) : null}
    </button>
  );
}

export function CardMenu({
  columns,
  isArchived,
  isAutoArchived,
  isMine,
  minDueDate,
  title,
  onArchive,
  onAssignToggle,
  onDueChange,
  onDuplicate,
  onMove,
  onOpenChange,
}: CardMenuProps) {
  const [open, setOpen] = useState(false);
  const [section, setSection] = useState<"due" | "move" | null>(null);
  const [customDate, setCustomDate] = useState("");
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);
  const menuId = useId();

  function close(returnFocus = true) {
    setOpen(false);
    setSection(null);
    onOpenChange?.(false);
    if (returnFocus) triggerRef.current?.focus();
  }

  function run(action?: () => void) {
    close();
    action?.();
  }

  useLayoutEffect(() => {
    if (!open || !triggerRef.current) return;
    const place = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const width = 240;
      const left = Math.max(8, Math.min(rect.right - width, window.innerWidth - width - 8));
      const panelHeight = panelRef.current?.offsetHeight ?? 0;
      const below = rect.bottom + 4;
      const top = below + panelHeight > window.innerHeight - 8 ? Math.max(8, rect.top - panelHeight - 4) : below;
      setPosition({ top, left });
    };
    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open, section]);

  // Focus the first item when opening; close on outside press.
  useEffect(() => {
    if (!open) return;
    const firstItem = panelRef.current?.querySelector<HTMLElement>('[role="menuitem"]:not(:disabled)');
    firstItem?.focus();
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node;
      if (panelRef.current?.contains(target) || triggerRef.current?.contains(target)) return;
      close(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  function onPanelKeyDown(event: ReactKeyboardEvent<HTMLDivElement>) {
    event.stopPropagation();
    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }
    if (event.key === "Tab") {
      close(false);
      return;
    }
    if (event.key !== "ArrowDown" && event.key !== "ArrowUp" && event.key !== "Home" && event.key !== "End") return;
    const items = Array.from(
      panelRef.current?.querySelectorAll<HTMLElement>('[role="menuitem"]:not(:disabled)') ?? [],
    );
    if (items.length === 0) return;
    event.preventDefault();
    const index = items.indexOf(document.activeElement as HTMLElement);
    const nextIndex =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? items.length - 1
          : (index + (event.key === "ArrowDown" ? 1 : -1) + items.length) % items.length;
    items[nextIndex]?.focus();
  }

  const quickDates = [
    { label: "Hoje", value: dateKeyFromToday(0) },
    { label: "Amanhã", value: dateKeyFromToday(1) },
    { label: "Daqui a uma semana", value: dateKeyFromToday(7) },
  ];

  return (
    <>
      <button
        aria-controls={open ? menuId : undefined}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`Ações do card ${title}`}
        className={`relative z-10 -mr-1 -mt-1 grid h-7 w-7 shrink-0 place-items-center rounded-md text-stone-400 transition hover:bg-stone-100 hover:text-pegasus-primary focus:outline-none focus-visible:opacity-100 focus-visible:ring-2 focus-visible:ring-pegasus-sky dark:hover:bg-slate-700 dark:hover:text-slate-100 ${
          open ? "bg-stone-100 opacity-100 dark:bg-slate-700" : "opacity-100 sm:opacity-0 sm:group-hover:opacity-100 [@media(hover:none)]:opacity-100"
        }`}
        onClick={(event) => {
          event.stopPropagation();
          if (open) {
            close();
          } else {
            setOpen(true);
            onOpenChange?.(true);
          }
        }}
        onKeyDown={(event) => event.stopPropagation()}
        ref={triggerRef}
        type="button"
        {...stopDrag}
      >
        <Ellipsis aria-hidden="true" size={16} />
      </button>

      {open
        ? createPortal(
            <div
              aria-label={`Ações do card ${title}`}
              className="fixed z-[60] w-60 rounded-lg border border-stone-200 bg-white p-1 shadow-xl animate-in fade-in-0 zoom-in-95 duration-100 dark:border-slate-700 dark:bg-slate-800"
              id={menuId}
              onKeyDown={onPanelKeyDown}
              ref={panelRef}
              role="menu"
              style={{ top: position?.top ?? -9999, left: position?.left ?? -9999 }}
              {...stopDrag}
            >
              {onAssignToggle ? (
                <MenuItem
                  icon={isMine ? <UserMinus size={15} /> : <UserPlus size={15} />}
                  onSelect={() => run(onAssignToggle)}
                >
                  {isMine ? "Tirar meu nome" : "Atribuir a mim"}
                </MenuItem>
              ) : null}

              {onDueChange ? (
                <>
                  <MenuItem
                    expanded={section === "due"}
                    icon={<CalendarDays size={15} />}
                    onSelect={() => setSection(section === "due" ? null : "due")}
                  >
                    Mudar prazo
                  </MenuItem>
                  {section === "due" ? (
                    <div className="mb-1 ml-7 border-l border-stone-200 pl-1 dark:border-slate-700">
                      {quickDates.map((option) => (
                        <MenuItem key={option.label} onSelect={() => run(() => onDueChange(option.value))}>
                          {option.label}
                        </MenuItem>
                      ))}
                      <form
                        className="flex items-center gap-1 px-1.5 py-1"
                        onSubmit={(event) => {
                          event.preventDefault();
                          if (customDate) run(() => onDueChange(customDate));
                        }}
                      >
                        <input
                          aria-label="Escolher data"
                          className="h-8 min-w-0 flex-1 rounded-md border border-stone-200 bg-white px-2 text-xs dark:border-slate-600 dark:bg-slate-900"
                          min={minDueDate}
                          onChange={(event) => setCustomDate(event.target.value)}
                          type="date"
                          value={customDate}
                        />
                        <button
                          className="h-8 rounded-md bg-pegasus-primary px-2.5 text-xs font-bold text-white disabled:opacity-40"
                          disabled={!customDate}
                          type="submit"
                        >
                          Salvar
                        </button>
                      </form>
                      <MenuItem onSelect={() => run(() => onDueChange(null))}>Sem prazo</MenuItem>
                    </div>
                  ) : null}
                </>
              ) : null}

              {onMove ? (
                <>
                  <MenuItem
                    expanded={section === "move"}
                    icon={<ArrowRightLeft size={15} />}
                    onSelect={() => setSection(section === "move" ? null : "move")}
                  >
                    Mover para…
                  </MenuItem>
                  {section === "move" ? (
                    <div className="mb-1 ml-7 border-l border-stone-200 pl-1 dark:border-slate-700">
                      {columns.map((column) => (
                        <MenuItem
                          disabled={column.disabled}
                          key={column.value}
                          onSelect={() => run(() => onMove(column.value))}
                        >
                          {column.label}
                        </MenuItem>
                      ))}
                    </div>
                  ) : null}
                </>
              ) : null}

              {onDuplicate ? (
                <MenuItem icon={<Copy size={15} />} onSelect={() => run(onDuplicate)}>
                  Duplicar
                </MenuItem>
              ) : null}

              {onArchive && !isAutoArchived ? (
                <MenuItem
                  icon={isArchived ? <ArchiveRestore size={15} /> : <Archive size={15} />}
                  onSelect={() => run(() => onArchive(!isArchived))}
                >
                  {isArchived ? "Desarquivar" : "Arquivar"}
                </MenuItem>
              ) : null}
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
