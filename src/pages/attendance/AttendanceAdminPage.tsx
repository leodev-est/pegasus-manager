import { CalendarDays, Loader2, Search, UserCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import { Button } from "../../components/ui/Button";
import { EmptyState } from "../../components/ui/EmptyState";
import { FilterBar } from "../../components/ui/FilterBar";
import { Input } from "../../components/ui/Input";
import { Modal } from "../../components/ui/Modal";
import { PageHeader } from "../../components/ui/PageHeader";
import { Select } from "../../components/ui/Select";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import {
  attendanceService,
  type AthleteFrequency,
  type AttendanceStatus,
  type FrequencyDetail,
} from "../../services/attendanceService";
import {
  formatDate,
  fromMonthInput,
  getCurrentMonthYear,
  statusLabel,
  statusTone,
  toMonthInput,
} from "./attendanceUi";

const initialMonth = getCurrentMonthYear();

const editableStatuses: Array<Exclude<AttendanceStatus, "programado">> = [
  "presente",
  "falta",
  "justificada",
];

export function AttendanceAdminPage() {
  const { showToast } = useToast();
  const [monthValue, setMonthValue] = useState(toMonthInput(initialMonth.month, initialMonth.year));
  const [search, setSearch] = useState("");
  const [data, setData] = useState<AthleteFrequency[]>([]);
  const [selectedAthlete, setSelectedAthlete] = useState<AthleteFrequency | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadFrequency = useCallback(async () => {
    const { month, year } = fromMonthInput(monthValue);
    setIsLoading(true);

    try {
      setData(await attendanceService.getFrequency(month, year));
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [monthValue, showToast]);

  useEffect(() => {
    loadFrequency();
  }, [loadFrequency]);

  const filteredData = useMemo(() => {
    const normalizedSearch = search.trim().toLowerCase();
    if (!normalizedSearch) return data;

    return data.filter((item) =>
      [item.athlete.name, item.athlete.category, item.athlete.position]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(normalizedSearch)),
    );
  }, [data, search]);

  async function updateDetail(detail: FrequencyDetail, status: Exclude<AttendanceStatus, "programado">) {
    if (!detail.attendanceId) {
      showToast("Ainda não existe lançamento para esta data. Ajuste manual ficará para a próxima versão.", "error");
      return;
    }

    setIsSaving(true);

    try {
      await attendanceService.updateAttendance(detail.attendanceId, { status });
      await loadFrequency();
      showToast("Frequência atualizada.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader title="Frequência" description="Acompanhamento mensal de presença nos treinos." />

      <FilterBar>
        <Input label="Mês" onChange={(event) => setMonthValue(event.target.value)} type="month" value={monthValue} />
        <Input
          label="Buscar atleta"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Nome, categoria ou posição"
          value={search}
        />
      </FilterBar>

      <section className="panel overflow-hidden">
        <div className="flex items-center gap-3 border-b border-blue-100 p-5">
          <UserCheck className="text-pegasus-primary" size={22} />
          <div>
            <h2 className="text-xl font-black text-pegasus-navy">Resumo por atleta</h2>
            <p className="text-sm text-slate-500">{filteredData.length} atleta(s) encontrados.</p>
          </div>
        </div>

        {isLoading ? (
          <div className="flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
            <Loader2 className="animate-spin" size={18} />
            Carregando frequência
          </div>
        ) : filteredData.length ? (
          <div className="grid gap-4 p-4 lg:grid-cols-2">
            {filteredData.map((item) => (
              <article className="rounded-2xl border border-blue-100 bg-white p-4 shadow-sm" key={item.athlete.id}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div>
                    <h3 className="font-black text-pegasus-navy">{item.athlete.name}</h3>
                    <p className="text-sm text-slate-500">
                      {item.athlete.category ?? "Sem categoria"} · {item.athlete.position ?? "Sem posição"}
                    </p>
                  </div>
                  <StatusBadge label={`${item.percentual}%`} tone={item.percentual >= 75 ? "success" : "warning"} />
                </div>

                <div className="mt-4 grid grid-cols-3 gap-2 text-center text-sm">
                  <div className="rounded-2xl bg-pegasus-surface p-3">
                    <p className="font-black text-pegasus-navy">{item.presencas}</p>
                    <p className="text-slate-500">Presenças</p>
                  </div>
                  <div className="rounded-2xl bg-pegasus-surface p-3">
                    <p className="font-black text-pegasus-navy">{item.faltas}</p>
                    <p className="text-slate-500">Faltas</p>
                  </div>
                  <div className="rounded-2xl bg-pegasus-surface p-3">
                    <p className="font-black text-pegasus-navy">{item.justificadas}</p>
                    <p className="text-slate-500">Just.</p>
                  </div>
                </div>

                <Button className="mt-4 w-full" onClick={() => setSelectedAthlete(item)} variant="secondary">
                  <Search size={17} />
                  Ver detalhes
                </Button>
              </article>
            ))}
          </div>
        ) : (
          <div className="p-6">
            <EmptyState
              description="Ajuste o mês ou a busca para visualizar a frequência."
              icon={CalendarDays}
              title="Nenhum atleta encontrado"
            />
          </div>
        )}
      </section>

      <Modal
        isOpen={Boolean(selectedAthlete)}
        onClose={() => setSelectedAthlete(null)}
        title={selectedAthlete?.athlete.name ?? "Detalhes da frequência"}
      >
        {selectedAthlete ? (
          <div className="space-y-3">
            {selectedAthlete.details.map((detail) => (
              <article className="rounded-2xl border border-blue-100 bg-white p-4" key={detail.date}>
                <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <p className="font-black text-pegasus-navy">{formatDate(detail.date)}</p>
                    <p className="text-sm text-slate-500">
                      {detail.horario} · {detail.local}
                    </p>
                  </div>
                  <StatusBadge label={statusLabel(detail.status)} tone={statusTone(detail.status)} />
                </div>
                {detail.status !== "programado" ? (
                  <div className="mt-3">
                    <Select
                      label="Ajustar status"
                      onChange={(event) =>
                        updateDetail(detail, event.target.value as Exclude<AttendanceStatus, "programado">)
                      }
                      options={editableStatuses.map((status) => ({ label: statusLabel(status), value: status }))}
                      value={detail.status}
                      disabled={isSaving || !detail.attendanceId}
                    />
                  </div>
                ) : null}
              </article>
            ))}
          </div>
        ) : null}
      </Modal>
    </div>
  );
}
