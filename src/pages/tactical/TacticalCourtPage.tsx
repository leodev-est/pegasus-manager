import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core";
import { CSS } from "@dnd-kit/utilities";
import { Check, Loader2, RotateCcw, Save, Trash2, Volleyball } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { athleteService, type Athlete } from "../../services/athleteService";
import {
  formationService,
  type Formation,
  type FormationPositions,
  type FormationSlot,
} from "../../services/formationService";

const slots: Array<{
  id: FormationSlot;
  label: string;
  area: "Rede" | "Fundo";
  className: string;
}> = [
  { id: "ponteiro2", label: "Ponteiro 2", area: "Rede", className: "left-[7%] top-[12%]" },
  { id: "central", label: "Central", area: "Rede", className: "left-1/2 top-[12%] -translate-x-1/2" },
  { id: "oposto", label: "Oposto", area: "Rede", className: "right-[7%] top-[12%]" },
  { id: "libero", label: "Líbero", area: "Fundo", className: "left-[7%] bottom-[12%]" },
  { id: "ponteiro1", label: "Ponteiro 1", area: "Fundo", className: "left-1/2 bottom-[12%] -translate-x-1/2" },
  { id: "levantador", label: "Levantador", area: "Fundo", className: "right-[7%] bottom-[12%]" },
];

const emptyPositions: FormationPositions = {
  levantador: null,
  oposto: null,
  ponteiro1: null,
  ponteiro2: null,
  central: null,
  libero: null,
};

function normalizePosition(value?: string | null) {
  const position = value?.toLowerCase() ?? "";
  if (position.includes("levant")) return "levantador";
  if (position.includes("oposto")) return "oposto";
  if (position.includes("central")) return "central";
  if (position.includes("libero") || position.includes("líbero")) return "libero";
  if (position.includes("ponteiro")) return "ponteiro";
  return "";
}

function buildBaseFormation(athletes: Athlete[]): FormationPositions {
  const activeAthletes = athletes.filter((athlete) => athlete.status !== "inativo");
  const used = new Set<string>();

  function take(match: (athlete: Athlete) => boolean) {
    const athlete = activeAthletes.find((item) => !used.has(item.id) && match(item));
    if (!athlete) return null;
    used.add(athlete.id);
    return athlete.id;
  }

  return {
    levantador: take((athlete) => normalizePosition(athlete.position) === "levantador"),
    oposto: take((athlete) => normalizePosition(athlete.position) === "oposto"),
    ponteiro1: take((athlete) => normalizePosition(athlete.position) === "ponteiro"),
    ponteiro2: take((athlete) => normalizePosition(athlete.position) === "ponteiro"),
    central: take((athlete) => normalizePosition(athlete.position) === "central"),
    libero: take((athlete) => normalizePosition(athlete.position) === "libero"),
  };
}

function getPlayer(athletesById: Map<string, Athlete>, playerId: string | null) {
  return playerId ? athletesById.get(playerId) ?? null : null;
}

function findSlotByPlayer(positions: FormationPositions, playerId: string) {
  return (Object.entries(positions) as Array<[FormationSlot, string | null]>).find(
    ([, currentPlayerId]) => currentPlayerId === playerId,
  )?.[0];
}

function PlayerCard({ athlete, compact = false }: { athlete: Athlete; compact?: boolean }) {
  return (
    <div
      className={`rounded-2xl border border-blue-100 bg-white shadow-sm ${
        compact ? "px-3 py-2" : "px-4 py-3"
      }`}
    >
      <p className="truncate font-black text-pegasus-navy">{athlete.name}</p>
      <p className="truncate text-xs font-semibold text-slate-500">{athlete.position || "Sem posição"}</p>
    </div>
  );
}

function DraggablePlayer({
  athlete,
  compact = false,
  disabled,
}: {
  athlete: Athlete;
  compact?: boolean;
  disabled: boolean;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: `player:${athlete.id}`,
    disabled,
  });

  return (
    <div
      className={`touch-none transition ${disabled ? "" : "cursor-grab active:cursor-grabbing"} ${
        isDragging ? "opacity-40" : ""
      }`}
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform) }}
      {...attributes}
      {...listeners}
    >
      <PlayerCard athlete={athlete} compact={compact} />
    </div>
  );
}

function CourtSlot({
  athlete,
  canEdit,
  className,
  label,
  slot,
  onRemove,
}: {
  athlete: Athlete | null;
  canEdit: boolean;
  className: string;
  label: string;
  slot: FormationSlot;
  onRemove: (slot: FormationSlot) => void;
}) {
  const { isOver, setNodeRef } = useDroppable({ id: `slot:${slot}`, disabled: !canEdit });

  return (
    <div
      className={`absolute w-[28%] max-w-52 transition ${className}`}
      ref={setNodeRef}
    >
      <div
        className={`min-h-28 rounded-2xl border-2 border-dashed p-3 shadow-sm transition ${
          isOver ? "border-pegasus-primary bg-white" : "border-white/70 bg-white/80"
        }`}
      >
        <p className="text-xs font-black uppercase tracking-[0.12em] text-pegasus-primary">{label}</p>
        {athlete ? (
          <div className="mt-2">
            <DraggablePlayer athlete={athlete} compact disabled={!canEdit} />
            {canEdit ? (
              <button
                className="mt-2 inline-flex items-center gap-1 text-xs font-bold text-rose-700"
                onClick={() => onRemove(slot)}
                type="button"
              >
                <Trash2 size={13} />
                Remover
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 text-sm font-semibold text-slate-500">
            {canEdit ? "Arraste jogador" : "Sem jogador"}
          </p>
        )}
      </div>
    </div>
  );
}

function BenchDropZone({ canEdit, isEmpty }: { canEdit: boolean; isEmpty: boolean }) {
  const { isOver, setNodeRef } = useDroppable({ id: "bench", disabled: !canEdit });

  return (
    <div
      className={`rounded-2xl border border-dashed p-3 text-center text-sm font-bold transition ${
        isOver ? "border-rose-300 bg-rose-50 text-rose-700" : "border-blue-100 bg-white text-slate-500"
      }`}
      ref={setNodeRef}
    >
      {isEmpty ? "Lista disponível" : "Solte aqui para remover da quadra"}
    </div>
  );
}

export function TacticalCourtPage() {
  const { hasPermission, user } = useAuth();
  const { showToast } = useToast();
  const canEdit = hasPermission(["trainings:update"]);
  const canCreate = hasPermission(["trainings:create"]);
  const canDelete = hasPermission(["trainings:delete"]);
  const canManageFormation = canCreate || canEdit;
  // All authenticated users can view the court (athletes, gestao, etc.)
  const canView = Boolean(user);
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [formations, setFormations] = useState<Formation[]>([]);
  const [selectedFormationId, setSelectedFormationId] = useState("base");
  const [formationName, setFormationName] = useState("Formação base");
  const [positions, setPositions] = useState<FormationPositions>(emptyPositions);
  const [activeAthleteId, setActiveAthleteId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 6 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 140, tolerance: 8 } }),
  );
  const athletesById = useMemo(() => new Map(athletes.map((athlete) => [athlete.id, athlete])), [athletes]);
  const assignedPlayerIds = useMemo(
    () => new Set(Object.values(positions).filter(Boolean) as string[]),
    [positions],
  );
  const availableAthletes = athletes.filter(
    (athlete) => athlete.status !== "inativo" && !assignedPlayerIds.has(athlete.id),
  );
  const activeAthlete = activeAthleteId ? athletesById.get(activeAthleteId) ?? null : null;

  const loadData = useCallback(async () => {
    setIsLoading(true);

    try {
      const [athletesData, formationsData] = await Promise.all([
        athleteService.getAll({ status: "ativo" }),
        formationService.getAll(),
      ]);
      setAthletes(athletesData);
      setFormations(formationsData);
      setPositions(buildBaseFormation(athletesData));
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  function applyBaseFormation() {
    setSelectedFormationId("base");
    setFormationName("Formação base");
    setPositions(buildBaseFormation(athletes));
  }

  function handleSelectFormation(value: string) {
    if (value === "base") {
      applyBaseFormation();
      return;
    }

    const formation = formations.find((item) => item.id === value);
    if (!formation) return;

    setSelectedFormationId(formation.id);
    setFormationName(formation.name);
    setPositions({ ...emptyPositions, ...formation.positions });
  }

  function movePlayer(playerId: string, targetSlot: FormationSlot | "bench") {
    setPositions((current) => {
      const next = { ...current };
      const sourceSlot = findSlotByPlayer(next, playerId);

      if (sourceSlot) {
        next[sourceSlot] = null;
      }

      if (targetSlot === "bench") {
        return next;
      }

      const targetPlayerId = next[targetSlot];
      next[targetSlot] = playerId;

      if (sourceSlot && targetPlayerId) {
        next[sourceSlot] = targetPlayerId;
      }

      return next;
    });
  }

  function handleDragStart(event: DragStartEvent) {
    if (!canEdit) return;
    const id = String(event.active.id);
    if (id.startsWith("player:")) {
      setActiveAthleteId(id.replace("player:", ""));
    }
  }

  function handleDragEnd(event: DragEndEvent) {
    const activeId = String(event.active.id);
    const overId = event.over?.id ? String(event.over.id) : "";
    setActiveAthleteId(null);

    if (!canEdit || !activeId.startsWith("player:") || !overId) return;

    const playerId = activeId.replace("player:", "");

    if (overId === "bench") {
      movePlayer(playerId, "bench");
      return;
    }

    if (overId.startsWith("slot:")) {
      movePlayer(playerId, overId.replace("slot:", "") as FormationSlot);
    }
  }

  async function saveFormation() {
    if (!canManageFormation) return;
    setIsSaving(true);

    try {
      if (selectedFormationId !== "base") {
        await formationService.update(selectedFormationId, {
          name: formationName,
          positions,
        });
        showToast("Formação atualizada com sucesso.", "success");
      } else {
        const created = await formationService.create({
          name: formationName || "Formação base",
          createdBy: user?.name ?? "Pegasus",
          positions,
        });
        setSelectedFormationId(created.id);
        showToast("Formação salva com sucesso.", "success");
      }

      const data = await formationService.getAll();
      setFormations(data);
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function deleteFormation() {
    if (selectedFormationId === "base") return;
    setIsSaving(true);

    try {
      await formationService.remove(selectedFormationId);
      showToast("Formação excluída com sucesso.", "success");
      const data = await formationService.getAll();
      setFormations(data);
      applyBaseFormation();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <DndContext
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
      onDragStart={handleDragStart}
      sensors={sensors}
    >
      <div className="space-y-8">
        <PageHeader
          title="Quadra Tática"
          description={
            canEdit
              ? "Monte formações de voleibol arrastando atletas para as posições da quadra."
              : "Visualize as formações táticas cadastradas para os treinos."
          }
          action={
            canManageFormation ? (
              <Button disabled={isSaving} onClick={saveFormation} className="w-full sm:w-auto">
                {isSaving ? <Loader2 className="animate-spin" size={17} /> : <Save size={17} />}
                Salvar formação
              </Button>
            ) : null
          }
        />

        <section
          className={`panel grid gap-4 p-5 lg:items-end ${
            canManageFormation ? "lg:grid-cols-[1fr_1fr_1fr_auto]" : "lg:grid-cols-[1fr_auto]"
          }`}
        >
          <Select
            label="Selecionar formação"
            onChange={(event) => handleSelectFormation(event.target.value)}
            options={[
              { label: "Formação base", value: "base" },
              ...formations.map((formation) => ({ label: formation.name, value: formation.id })),
            ]}
            value={selectedFormationId}
          />
          {canManageFormation ? (
            <>
          <Input
            disabled={!canManageFormation}
            label="Nome da formação"
            onChange={(event) => setFormationName(event.target.value)}
            value={formationName}
          />
          <Button onClick={applyBaseFormation} variant="secondary">
            <RotateCcw size={17} />
            Formação base
          </Button>
            </>
          ) : (
            <div className="rounded-2xl bg-pegasus-surface px-4 py-3">
              <p className="text-xs font-black uppercase tracking-[0.12em] text-pegasus-primary">Modo</p>
              <p className="font-black text-pegasus-navy">Somente visualizacao</p>
            </div>
          )}
          {canDelete && selectedFormationId !== "base" ? (
            <Button disabled={isSaving} onClick={deleteFormation} variant="danger">
              <Trash2 size={17} />
              Excluir
            </Button>
          ) : null}
        </section>

        {!canView ? (
          <div className="panel p-6 text-sm text-slate-500">Acesso restrito.</div>
        ) : isLoading ? (
          <div className="panel flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando quadra tática
          </div>
        ) : (
          <section className={`grid gap-6 ${canEdit ? "xl:grid-cols-[0.8fr_1.4fr]" : ""}`}>
            {canEdit ? (
            <aside className="panel p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-xl font-black text-pegasus-navy">Jogadores</h2>
                  <p className="text-sm text-slate-500">{availableAthletes.length} disponíveis</p>
                </div>
                <Volleyball className="text-pegasus-primary" size={24} />
              </div>
              <div className="mt-5">
                <BenchDropZone canEdit={canEdit} isEmpty={availableAthletes.length === athletes.length} />
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                {availableAthletes.length > 0 ? (
                  availableAthletes.map((athlete) => (
                    <DraggablePlayer athlete={athlete} disabled={!canEdit} key={athlete.id} />
                  ))
                ) : (
                  <EmptyState
                    description="Todos os atletas disponíveis já estão posicionados na quadra."
                    icon={Check}
                    title="Lista vazia"
                  />
                )}
              </div>
            </aside>
            ) : null}

            <section className="panel overflow-hidden p-4 sm:p-6">
              <div className="mb-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <h2 className="text-xl font-black text-pegasus-navy">Quadra de vôlei</h2>
                  <p className="text-sm text-slate-500">
                    Formação com levantador no fundo direito, rotação base de defesa.
                  </p>
                </div>
                {!canEdit ? (
                  <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-bold text-amber-700 ring-1 ring-amber-200">
                    Visualização
                  </span>
                ) : null}
              </div>

              <div className="relative mx-auto aspect-[1.55/1] min-h-[430px] w-full overflow-hidden rounded-3xl border-4 border-white bg-[#7ED6E8] shadow-inner ring-1 ring-blue-100">
                <div className="absolute inset-x-0 top-1/2 h-1 -translate-y-1/2 bg-white/90" />
                <div className="absolute inset-y-0 left-1/2 w-1 -translate-x-1/2 bg-white/70" />
                <div className="absolute inset-x-[3%] top-[28%] h-0.5 bg-white/70" />
                <div className="absolute inset-x-[3%] bottom-[28%] h-0.5 bg-white/70" />
                <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full bg-white/85 px-3 py-1 text-xs font-black uppercase tracking-[0.14em] text-pegasus-primary">
                  Rede
                </div>
                <div className="absolute bottom-3 left-4 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-pegasus-primary">
                  Fundo
                </div>
                <div className="absolute left-4 top-3 rounded-full bg-white/85 px-3 py-1 text-xs font-bold text-pegasus-primary">
                  Rede
                </div>

                {slots.map((slot) => (
                  <CourtSlot
                    athlete={getPlayer(athletesById, positions[slot.id])}
                    canEdit={canEdit}
                    className={slot.className}
                    key={slot.id}
                    label={slot.label}
                    slot={slot.id}
                    onRemove={(slotId) => {
                      if (!canEdit) return;
                      setPositions((current) => ({ ...current, [slotId]: null }));
                    }}
                  />
                ))}
              </div>
            </section>
          </section>
        )}
      </div>

      <DragOverlay>
        {activeAthlete ? (
          <div className="w-60">
            <PlayerCard athlete={activeAthlete} />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
