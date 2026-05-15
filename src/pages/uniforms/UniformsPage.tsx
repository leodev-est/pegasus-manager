import { AlertTriangle, Edit2, Package, Plus, Shirt, Trash2, UserCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../../auth/AuthContext";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { athleteService, type Athlete, type AthleteGender } from "../../services/athleteService";
import { jerseyService, type JerseyAssignment } from "../../services/jerseyService";
import { uniformsService, type DeliveryPayload, type UniformDelivery, type UniformItem } from "../../services/uniformsService";

type Tab = "masculino" | "feminino" | "estoque" | "entregas";

const JERSEY_NUMBERS = Array.from({ length: 99 }, (_, i) => i + 1);

const TAB_LABELS: Record<Tab, string> = {
  masculino: "Elenco Masculino",
  feminino: "Elenco Feminino",
  estoque: "Estoque",
  entregas: "Entregas",
};

function JerseyCard({
  number,
  assignment,
  availableAthletes,
  canEdit,
  onAssign,
  onUnassign,
  isSaving,
}: {
  number: number;
  assignment: JerseyAssignment | undefined;
  availableAthletes: Athlete[];
  canEdit: boolean;
  onAssign: (number: number, athleteId: string) => void;
  onUnassign: (number: number) => void;
  isSaving: boolean;
}) {
  const assigned = assignment?.athlete ?? null;
  const isAssigned = Boolean(assigned);

  function handleChange(e: React.ChangeEvent<HTMLSelectElement>) {
    const val = e.target.value;
    if (!val) onUnassign(number);
    else onAssign(number, val);
  }

  return (
    <div
      className={`relative flex flex-col items-center rounded-2xl border p-4 transition-all ${
        isAssigned
          ? "border-pegasus-primary bg-pegasus-primary/5 shadow-sm"
          : "border-slate-200 bg-white"
      }`}
    >
      <span
        className={`text-3xl font-black leading-none tabular-nums ${
          isAssigned ? "text-pegasus-primary" : "text-slate-300"
        }`}
      >
        {String(number).padStart(2, "0")}
      </span>

      {isAssigned ? (
        <p className="mt-2 line-clamp-1 text-center text-xs font-bold text-pegasus-navy">
          {assigned!.name.split(" ")[0]}
        </p>
      ) : (
        <p className="mt-2 text-xs text-slate-300">Livre</p>
      )}

      {canEdit && (
        <select
          disabled={isSaving}
          value={assignment?.athleteId ?? ""}
          onChange={handleChange}
          className="mt-2 w-full rounded-lg border border-slate-200 bg-white px-1.5 py-1 text-xs text-slate-600 focus:border-pegasus-primary focus:outline-none focus:ring-1 focus:ring-pegasus-primary disabled:opacity-50"
        >
          <option value="">— Livre —</option>
          {assigned && <option value={assigned.id}>{assigned.name}</option>}
          {availableAthletes.map((a) => (
            <option key={a.id} value={a.id}>
              {a.name}
            </option>
          ))}
        </select>
      )}
    </div>
  );
}

function JerseyTab({
  gender,
  athletes,
  assignments,
  canEdit,
  onAssign,
  onUnassign,
  isSaving,
}: {
  gender: AthleteGender;
  athletes: Athlete[];
  assignments: JerseyAssignment[];
  canEdit: boolean;
  onAssign: (number: number, athleteId: string) => void;
  onUnassign: (number: number) => void;
  isSaving: boolean;
}) {
  const assignedAthleteIds = useMemo(
    () => new Set(assignments.map((a) => a.athleteId)),
    [assignments],
  );

  const assignmentByNumber = useMemo(
    () => new Map(assignments.map((a) => [a.number, a])),
    [assignments],
  );

  const genderAthletes = useMemo(
    () => athletes.filter((a) => a.gender === gender && a.status === "ativo"),
    [athletes, gender],
  );

  const assigned = assignments.length;
  const total = genderAthletes.length;

  if (genderAthletes.length === 0) {
    return (
      <div className="flex flex-col items-center py-16 text-slate-400">
        <Shirt size={40} className="mb-4 opacity-20" />
        <p className="text-sm font-medium">
          Nenhum atleta {gender === "masculino" ? "masculino" : "feminino"} ativo com gênero definido.
        </p>
        <p className="mt-1 text-xs">
          Defina o gênero dos atletas na aba <strong>RH / Atletas</strong>.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center gap-4 text-sm">
        <span className="font-bold text-pegasus-navy">
          {assigned}/{total} atleta{total !== 1 ? "s" : ""} com camisa atribuída
        </span>
        {total > assigned && (
          <span className="text-slate-400">
            {total - assigned} sem número
          </span>
        )}
      </div>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-7 xl:grid-cols-9 2xl:grid-cols-11">
        {JERSEY_NUMBERS.map((n) => {
          const assignment = assignmentByNumber.get(n);
          const available = genderAthletes.filter(
            (a) => !assignedAthleteIds.has(a.id) || a.id === assignment?.athleteId,
          );
          return (
            <JerseyCard
              key={n}
              number={n}
              assignment={assignment}
              availableAthletes={available}
              canEdit={canEdit}
              onAssign={onAssign}
              onUnassign={onUnassign}
              isSaving={isSaving}
            />
          );
        })}
      </div>
    </div>
  );
}

export function UniformsPage() {
  const { hasPermission } = useAuth();
  const { showToast } = useToast();
  const canEdit = hasPermission(["gestao", "admin"]);

  const [tab, setTab] = useState<Tab>("masculino");
  const [athletes, setAthletes] = useState<Athlete[]>([]);
  const [assignments, setAssignments] = useState<{ masculino: JerseyAssignment[]; feminino: JerseyAssignment[] }>({ masculino: [], feminino: [] });
  const [items, setItems] = useState<UniformItem[]>([]);
  const [deliveries, setDeliveries] = useState<UniformDelivery[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const [itemModal, setItemModal] = useState(false);
  const [deliveryModal, setDeliveryModal] = useState(false);
  const [editingItem, setEditingItem] = useState<UniformItem | null>(null);
  const [itemForm, setItemForm] = useState({ name: "", description: "", stock: 0, minStock: 3 });
  const [deliveryForm, setDeliveryForm] = useState<DeliveryPayload>({ uniformItemId: "", athleteId: "", quantity: 1, notes: "" });

  const loadJerseys = useCallback(async () => {
    const [masc, fem] = await Promise.all([
      jerseyService.getAll("masculino"),
      jerseyService.getAll("feminino"),
    ]);
    setAssignments({ masculino: masc, feminino: fem });
  }, []);

  const loadItems = useCallback(async () => {
    const data = await uniformsService.getItems();
    setItems(data);
  }, []);

  const loadDeliveries = useCallback(async () => {
    const data = await uniformsService.getDeliveries();
    setDeliveries(data);
  }, []);

  useEffect(() => {
    setIsLoading(true);
    Promise.all([
      athleteService.getAll().then(setAthletes),
      loadJerseys(),
      loadItems(),
      loadDeliveries(),
    ])
      .catch(() => showToast("Erro ao carregar dados", "error"))
      .finally(() => setIsLoading(false));
  }, [loadJerseys, loadItems, loadDeliveries, showToast]);

  async function handleAssign(gender: AthleteGender, number: number, athleteId: string) {
    setIsSaving(true);
    try {
      const updated = await jerseyService.assign(gender, number, athleteId);
      setAssignments((prev) => {
        const filtered = prev[gender].filter((a) => a.number !== number && a.athleteId !== athleteId);
        return { ...prev, [gender]: [...filtered, updated] };
      });
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleUnassign(gender: AthleteGender, number: number) {
    setIsSaving(true);
    try {
      await jerseyService.unassign(gender, number);
      setAssignments((prev) => ({
        ...prev,
        [gender]: prev[gender].filter((a) => a.number !== number),
      }));
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  function openCreateItem() {
    setEditingItem(null);
    setItemForm({ name: "", description: "", stock: 0, minStock: 3 });
    setItemModal(true);
  }

  function openEditItem(item: UniformItem) {
    setEditingItem(item);
    setItemForm({ name: item.name, description: item.description ?? "", stock: item.stock, minStock: item.minStock });
    setItemModal(true);
  }

  async function handleSaveItem() {
    setIsSaving(true);
    try {
      if (editingItem) {
        await uniformsService.updateItem(editingItem.id, itemForm);
        showToast("Item atualizado.", "success");
      } else {
        await uniformsService.createItem(itemForm);
        showToast("Item criado.", "success");
      }
      setItemModal(false);
      loadItems();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteItem(id: string) {
    if (!confirm("Excluir este item? O histórico de entregas será perdido.")) return;
    try {
      await uniformsService.deleteItem(id);
      showToast("Item excluído.", "success");
      loadItems();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  }

  async function handleDelivery() {
    setIsSaving(true);
    try {
      await uniformsService.createDelivery(deliveryForm);
      showToast("Entrega registrada.", "success");
      setDeliveryModal(false);
      loadItems();
      loadDeliveries();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDeleteDelivery(id: string) {
    if (!confirm("Desfazer esta entrega? O estoque será restaurado.")) return;
    try {
      await uniformsService.deleteDelivery(id);
      showToast("Entrega removida.", "success");
      loadItems();
      loadDeliveries();
    } catch (err) {
      showToast(getApiErrorMessage(err), "error");
    }
  }

  const lowStock = items.filter((i) => i.stock <= i.minStock);
  const activeAthletes = athletes.filter((a) => a.status === "ativo");

  return (
    <div className="space-y-8">
      <PageHeader
        title="Uniformes"
        description="Numeração do elenco, estoque e entregas de uniformes."
        action={
          canEdit && (
            <div className="flex gap-2">
              {tab === "estoque" || tab === "entregas" ? (
                <>
                  <Button variant="secondary" onClick={() => { setDeliveryModal(true); setDeliveryForm({ uniformItemId: items[0]?.id ?? "", athleteId: "", quantity: 1, notes: "" }); }}>
                    <UserCheck size={16} className="mr-2" />
                    Registrar entrega
                  </Button>
                  <Button onClick={openCreateItem}>
                    <Plus size={16} className="mr-2" />
                    Novo item
                  </Button>
                </>
              ) : null}
            </div>
          )
        }
      />

      {lowStock.length > 0 && (tab === "estoque" || tab === "entregas") && (
        <div className="flex items-start gap-3 rounded-xl border border-yellow-200 bg-yellow-50 p-4">
          <AlertTriangle size={18} className="mt-0.5 shrink-0 text-yellow-600" />
          <div>
            <p className="text-sm font-medium text-yellow-800">Estoque baixo</p>
            <p className="text-sm text-yellow-700">{lowStock.map((i) => i.name).join(", ")}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 border-b border-slate-200">
        {(["masculino", "feminino", "estoque", "entregas"] as Tab[]).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2.5 text-sm font-medium transition-colors ${tab === t ? "border-b-2 border-pegasus-primary text-pegasus-primary" : "text-slate-500 hover:text-slate-700"}`}
          >
            {TAB_LABELS[t]}
          </button>
        ))}
      </div>

      {isLoading ? (
        <p className="text-sm text-slate-500">Carregando...</p>
      ) : tab === "masculino" || tab === "feminino" ? (
        <JerseyTab
          gender={tab}
          athletes={athletes}
          assignments={assignments[tab]}
          canEdit={canEdit}
          onAssign={(n, id) => handleAssign(tab, n, id)}
          onUnassign={(n) => handleUnassign(tab, n)}
          isSaving={isSaving}
        />
      ) : tab === "estoque" ? (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <div key={item.id} className="panel p-5">
              <div className="mb-3 flex items-start justify-between">
                <div className="flex items-center gap-2">
                  <Package size={18} className="text-pegasus-primary" />
                  <span className="font-semibold text-pegasus-navy">{item.name}</span>
                </div>
                {canEdit && (
                  <div className="flex gap-1">
                    <Button variant="ghost" size="sm" onClick={() => openEditItem(item)}>
                      <Edit2 size={13} />
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => handleDeleteItem(item.id)}>
                      <Trash2 size={13} className="text-red-500" />
                    </Button>
                  </div>
                )}
              </div>
              {item.description && <p className="mb-2 text-xs text-slate-500">{item.description}</p>}
              <div className="flex items-center justify-between">
                <span className={`text-2xl font-bold ${item.stock <= item.minStock ? "text-red-500" : "text-pegasus-primary"}`}>
                  {item.stock}
                </span>
                <span className="text-xs text-slate-400">mín. {item.minStock} · {item.deliveryCount} entregue(s)</span>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <p className="col-span-full py-8 text-center text-sm text-slate-500">Nenhum item cadastrado.</p>
          )}
        </div>
      ) : (
        <div className="space-y-3">
          {deliveries.map((d) => (
            <div key={d.id} className="panel flex items-center justify-between p-4">
              <div>
                <p className="font-medium text-pegasus-navy">{d.athlete.name}</p>
                <p className="text-sm text-slate-500">
                  {d.uniformItem.name} · {d.quantity} un. ·{" "}
                  {new Date(d.deliveredAt).toLocaleDateString("pt-BR")}
                  {d.notes && ` · ${d.notes}`}
                </p>
              </div>
              {canEdit && (
                <Button variant="ghost" size="sm" onClick={() => handleDeleteDelivery(d.id)}>
                  <Trash2 size={13} className="text-red-500" />
                </Button>
              )}
            </div>
          ))}
          {deliveries.length === 0 && (
            <p className="py-8 text-center text-sm text-slate-500">Nenhuma entrega registrada.</p>
          )}
        </div>
      )}

      {/* Item Modal */}
      <Modal isOpen={itemModal} onClose={() => setItemModal(false)} title={editingItem ? "Editar item" : "Novo item"}>
        <div className="space-y-4">
          <Input label="Nome" value={itemForm.name} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} />
          <Input label="Descrição (opcional)" value={itemForm.description} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} />
          <div className="grid grid-cols-2 gap-4">
            <Input label="Estoque atual" type="number" min="0" value={itemForm.stock} onChange={(e) => setItemForm({ ...itemForm, stock: Number(e.target.value) })} />
            <Input label="Estoque mínimo" type="number" min="0" value={itemForm.minStock} onChange={(e) => setItemForm({ ...itemForm, minStock: Number(e.target.value) })} />
          </div>
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setItemModal(false)}>Cancelar</Button>
            <Button onClick={handleSaveItem} disabled={isSaving}>{isSaving ? "Salvando..." : "Salvar"}</Button>
          </div>
        </div>
      </Modal>

      {/* Delivery Modal */}
      <Modal isOpen={deliveryModal} onClose={() => setDeliveryModal(false)} title="Registrar entrega">
        <div className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Item</label>
            <select className="input w-full" value={deliveryForm.uniformItemId} onChange={(e) => setDeliveryForm({ ...deliveryForm, uniformItemId: e.target.value })}>
              <option value="">Selecione...</option>
              {items.map((i) => <option key={i.id} value={i.id}>{i.name} (estoque: {i.stock})</option>)}
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">Atleta</label>
            <select className="input w-full" value={deliveryForm.athleteId} onChange={(e) => setDeliveryForm({ ...deliveryForm, athleteId: e.target.value })}>
              <option value="">Selecione...</option>
              {activeAthletes.map((a) => <option key={a.id} value={a.id}>{a.name}</option>)}
            </select>
          </div>
          <Input label="Quantidade" type="number" min="1" value={deliveryForm.quantity} onChange={(e) => setDeliveryForm({ ...deliveryForm, quantity: Number(e.target.value) })} />
          <Input label="Observações (opcional)" value={deliveryForm.notes ?? ""} onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })} />
          <div className="flex justify-end gap-3">
            <Button variant="ghost" onClick={() => setDeliveryModal(false)}>Cancelar</Button>
            <Button onClick={handleDelivery} disabled={isSaving}>{isSaving ? "Salvando..." : "Confirmar entrega"}</Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
