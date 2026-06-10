import { CheckCircle, ClipboardList, Info, Loader2, MessageSquare, XCircle } from "lucide-react";
import { useState } from "react";
import { useTour } from "../../tours/useTour";
import { useAthletes, useInvalidateAthletes } from "../../hooks/useAthletes";

const TOUR_STEPS = [
  {
    popover: {
      title: "🧪 Atletas em Teste",
      description: "Candidatos aprovados na inscrição que estão em período de avaliação. Aqui você decide quem vira atleta ativo no sistema.",
    },
  },
  {
    element: "[data-tour='testes-lista']",
    popover: {
      title: "Lista de candidatos em teste",
      description: "Clique em Aprovar para tornar o atleta ativo (ele recebe acesso ao app e às funcionalidades de atleta). Rejeitar encerra o período de teste.",
      side: "bottom" as const,
    },
  },
];
import { Button } from "../../components/ui/Button";
import { ConfirmDialog } from "../../components/ui/ConfirmDialog";
import { EmptyState } from "../../components/ui/EmptyState";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Table } from "../../components/ui/Table";
import { Textarea } from "../../components/ui/Textarea";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { athleteService, type Athlete } from "../../services/athleteService";
import { athleteApplicationService, type AthleteApplication } from "../../services/athleteApplicationService";

function formatDate(date: string) {
  return new Date(date).toLocaleDateString("pt-BR");
}

function InfoField({ label, value }: { label: string; value: React.ReactNode }) {
  if (!value) return null;
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-slate-400">{label}</p>
      <p className="mt-0.5 text-sm text-pegasus-navy">{value}</p>
    </div>
  );
}

function ApplicationInfoGrid({ application: a }: { application: AthleteApplication }) {
  const fmtDate = (v: string | null) => v ? new Date(v).toLocaleDateString("pt-BR") : "-";
  const bool = (v: boolean | null) => v === null ? "-" : v ? "Sim" : "Não";
  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <InfoField label="Nome" value={a.name} />
      <InfoField label="Nascimento" value={fmtDate(a.birthDate)} />
      <InfoField label="Telefone" value={a.phone} />
      <InfoField label="E-mail" value={a.email} />
      <InfoField label="Posição" value={a.position} />
      <InfoField label="Segunda Posição" value={a.secondPosition} />
      <InfoField label="Disposto a Treinar em" value={a.willingPositions?.replace(/,/g, ", ")} />
      <InfoField label="Nível" value={a.level} />
      <InfoField label="Tempo de Experiência" value={a.experienceTime} />
      <InfoField label="Joga em Time" value={bool(a.currentTeam)} />
      <InfoField label="Time Atual" value={a.currentTeamName} />
      <InfoField label="Disponível Sábados" value={bool(a.availableSaturdays)} />
      <InfoField label="Disposto a Campeonatos" value={bool(a.willingToCompete)} />
      <InfoField label="Indicação" value={a.referral} />
      <div className="sm:col-span-2"><InfoField label="Motivação" value={a.motivation} /></div>
      <div className="sm:col-span-2"><InfoField label="Como Descobriu" value={a.howFound} /></div>
      <div className="sm:col-span-2"><InfoField label="Contribuição" value={a.contribution} /></div>
      {a.notes && <div className="sm:col-span-2"><InfoField label="Observações Internas" value={a.notes} /></div>}
    </div>
  );
}

export function TestesPage() {
  const { showToast } = useToast();
  const { data: athletes = [], isLoading } = useAthletes({ status: "teste" });
  const invalidateAthletes = useInvalidateAthletes();

  useTour("testes:v1", isLoading ? [] : TOUR_STEPS);
  const [isSaving, setIsSaving] = useState(false);

  const [approveTarget, setApproveTarget] = useState<Athlete | null>(null);
  const [rejectTarget, setRejectTarget] = useState<Athlete | null>(null);
  const [notesTarget, setNotesTarget] = useState<Athlete | null>(null);
  const [notes, setNotes] = useState("");
  const [infoApplication, setInfoApplication] = useState<AthleteApplication | null>(null);
  const [isLoadingInfo, setIsLoadingInfo] = useState(false);

  async function openInfo(athlete: Athlete) {
    setIsLoadingInfo(true);
    try {
      const app = await athleteApplicationService.getByAthleteId(athlete.id);
      setInfoApplication(app);
    } catch {
      showToast("Inscrição não encontrada para este atleta.", "error");
    } finally {
      setIsLoadingInfo(false);
    }
  }

  function openNotes(athlete: Athlete) {
    setNotesTarget(athlete);
    setNotes(athlete.notes ?? "");
  }

  async function confirmApprove() {
    if (!approveTarget) return;
    setIsSaving(true);
    try {
      const updated = await athleteService.update(approveTarget.id, { status: "ativo" });
      showToast(
        updated.user?.username
          ? `Atleta aprovado. Usuário criado: ${updated.user.username}`
          : "Atleta aprovado com sucesso.",
        "success",
      );
      setApproveTarget(null);
      invalidateAthletes();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmReject() {
    if (!rejectTarget) return;
    setIsSaving(true);
    try {
      await athleteService.update(rejectTarget.id, { status: "inativo" });
      showToast("Teste recusado. Atleta movido para inativos.", "success");
      setRejectTarget(null);
      invalidateAthletes();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  async function saveNotes() {
    if (!notesTarget) return;
    setIsSaving(true);
    try {
      await athleteService.update(notesTarget.id, { notes });
      showToast("Observação salva.", "success");
      setNotesTarget(null);
      invalidateAthletes();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="RH / Testes"
        description="Avalie e aprove atletas em período de teste."
      />

      <section data-tour="testes-lista" className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-blue-100 p-6">
          <ClipboardList className="text-pegasus-primary" size={22} />
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">Atletas em teste</h2>
            <p className="text-sm text-slate-500">{athletes.length} atleta(s) aguardando avaliação.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando
          </div>
        ) : athletes.length > 0 ? (
          <>
            {/* Mobile */}
            <div className="grid gap-3 p-4 md:hidden">
              {athletes.map((athlete) => (
                <article key={athlete.id} className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm">
                  <div className="mb-1 flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-bold text-pegasus-navy">{athlete.name}</h3>
                      <p className="text-xs text-slate-500">{athlete.email ?? athlete.phone ?? "Sem contato"}</p>
                    </div>
                    <span className="text-xs text-slate-400">{formatDate(athlete.createdAt)}</span>
                  </div>
                  {athlete.notes ? (
                    <p className="mt-2 rounded-xl bg-blue-50 px-3 py-2 text-xs text-slate-600">
                      {athlete.notes}
                    </p>
                  ) : null}
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-blue-50 pt-3">
                    <button
                      className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                      onClick={() => setApproveTarget(athlete)}
                      type="button"
                    >
                      <CheckCircle size={15} />
                      Aprovar
                    </button>
                    <button
                      className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                      onClick={() => setRejectTarget(athlete)}
                      type="button"
                    >
                      <XCircle size={15} />
                      Recusar
                    </button>
                    <button
                      className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                      onClick={() => openNotes(athlete)}
                      type="button"
                    >
                      <MessageSquare size={15} />
                      Observações
                    </button>
                    <button
                      className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                      onClick={() => openInfo(athlete)}
                      type="button"
                    >
                      <Info size={15} />
                      Inscrição
                    </button>
                  </div>
                </article>
              ))}
            </div>

            {/* Desktop */}
            <div className="hidden md:block">
              <Table
                headers={["Nome", "Posição", "Categoria", "Entrada", "Observações", "Ações"]}
                minWidth="900px"
              >
                {athletes.map((athlete) => (
                  <tr key={athlete.id} className="bg-white">
                    <td className="px-6 py-4">
                      <p className="font-bold text-pegasus-navy">{athlete.name}</p>
                      <p className="text-xs text-slate-500">{athlete.email ?? "-"}</p>
                    </td>
                    <td className="px-6 py-4 text-slate-600">{athlete.position ?? "-"}</td>
                    <td className="px-6 py-4 text-slate-600">{athlete.category ?? "-"}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{formatDate(athlete.createdAt)}</td>
                    <td className="max-w-[200px] px-6 py-4 text-sm text-slate-500">
                      {athlete.notes ? (
                        <span className="line-clamp-2">{athlete.notes}</span>
                      ) : (
                        <span className="italic text-slate-300">—</span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2">
                        <button
                          className="flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-1.5 text-sm font-semibold text-emerald-700 hover:bg-emerald-100"
                          onClick={() => setApproveTarget(athlete)}
                          type="button"
                        >
                          <CheckCircle size={15} />
                          Aprovar
                        </button>
                        <button
                          className="flex items-center gap-1.5 rounded-xl bg-rose-50 px-3 py-1.5 text-sm font-semibold text-rose-700 hover:bg-rose-100"
                          onClick={() => setRejectTarget(athlete)}
                          type="button"
                        >
                          <XCircle size={15} />
                          Recusar
                        </button>
                        <button
                          className="flex items-center gap-1.5 rounded-xl bg-slate-100 px-3 py-1.5 text-sm font-semibold text-slate-600 hover:bg-slate-200"
                          onClick={() => openNotes(athlete)}
                          type="button"
                        >
                          <MessageSquare size={15} />
                          Obs.
                        </button>
                        <button
                          className="flex items-center gap-1.5 rounded-xl bg-blue-50 px-3 py-1.5 text-sm font-semibold text-blue-700 hover:bg-blue-100"
                          onClick={() => openInfo(athlete)}
                          type="button"
                        >
                          <Info size={15} />
                          Inscrição
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </Table>
            </div>
          </>
        ) : (
          <div className="p-6">
            <EmptyState
              description="Nenhum atleta aguardando avaliação no momento."
              icon={ClipboardList}
              title="Nenhum teste pendente"
            />
          </div>
        )}
      </section>

      {/* Aprovar */}
      <ConfirmDialog
        confirmLabel={isSaving ? "Aprovando..." : "Aprovar atleta"}
        description={`Confirma a aprovação de ${approveTarget?.name ?? "este atleta"}? O status será alterado para Ativo e um acesso de usuário será criado automaticamente.`}
        isOpen={Boolean(approveTarget)}
        onClose={() => setApproveTarget(null)}
        onConfirm={confirmApprove}
        title="Aprovar teste"
      />

      {/* Recusar */}
      <ConfirmDialog
        confirmLabel={isSaving ? "Recusando..." : "Recusar atleta"}
        description={`Confirma a recusa de ${rejectTarget?.name ?? "este atleta"}? O atleta será movido para inativos.`}
        isOpen={Boolean(rejectTarget)}
        onClose={() => setRejectTarget(null)}
        onConfirm={confirmReject}
        title="Recusar teste"
      />

      {/* Inscrição */}
      <Modal
        description="Dados preenchidos no formulário de inscrição."
        isOpen={Boolean(infoApplication) || isLoadingInfo}
        onClose={() => setInfoApplication(null)}
        title={infoApplication?.name ?? "Carregando..."}
      >
        {isLoadingInfo ? (
          <div className="flex items-center gap-2 py-4 text-sm text-pegasus-primary">
            <Loader2 className="animate-spin" size={16} /> Carregando inscrição...
          </div>
        ) : infoApplication ? (
          <ApplicationInfoGrid application={infoApplication} />
        ) : null}
      </Modal>

      {/* Observações */}
      <Modal
        description={`Adicione ou edite observações sobre ${notesTarget?.name ?? "este atleta"}.`}
        isOpen={Boolean(notesTarget)}
        onClose={() => setNotesTarget(null)}
        title="Observações"
      >
        <div className="grid gap-4">
          <Textarea
            label="Observações"
            onChange={(e) => setNotes(e.target.value)}
            value={notes}
          />
          <div className="flex flex-col gap-3 sm:flex-row">
            <Button disabled={isSaving} onClick={saveNotes} type="button">
              {isSaving ? (
                <>
                  <Loader2 className="animate-spin" size={17} />
                  Salvando
                </>
              ) : (
                "Salvar observação"
              )}
            </Button>
            <Button disabled={isSaving} onClick={() => setNotesTarget(null)} variant="secondary">
              Cancelar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
