import { AlertCircle, ChevronLeft, ChevronRight, ClipboardList, Loader2, MapPin, Users } from "lucide-react";
import { useEffect, useState } from "react";
import { useToast } from "../../components/ui/Toast";
import {
  type ChamadaAthlete,
  type ChamadaAttendanceStatus,
  attendanceService,
} from "../../services/attendanceService";
import { formatDateLong } from "./attendanceUi";

function getBrazilTodayKey(): string {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "America/Sao_Paulo",
  }).format(new Date());
}

function addDays(dateKey: string, days: number): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function nearestSaturday(dateKey: string): string {
  const [year, month, day] = dateKey.split("-").map(Number);
  const d = new Date(Date.UTC(year, month - 1, day));
  const dow = d.getUTCDay();
  if (dow === 6) return dateKey;
  const daysUntil = (6 - dow + 7) % 7;
  d.setUTCDate(d.getUTCDate() + daysUntil);
  return d.toISOString().slice(0, 10);
}

const STATUS_CONFIG: Record<ChamadaAttendanceStatus, { label: string; active: string; idle: string }> = {
  presente: {
    label: "Presente",
    active: "bg-emerald-500 text-white shadow-sm",
    idle: "border border-emerald-300 text-emerald-700 hover:bg-emerald-50",
  },
  falta: {
    label: "Falta",
    active: "bg-rose-500 text-white shadow-sm",
    idle: "border border-rose-300 text-rose-700 hover:bg-rose-50",
  },
  justificada: {
    label: "Justificada",
    active: "bg-amber-400 text-white shadow-sm",
    idle: "border border-amber-300 text-amber-700 hover:bg-amber-50",
  },
};

const STATUS_DOT: Record<ChamadaAttendanceStatus, string> = {
  presente: "bg-emerald-500",
  falta: "bg-rose-500",
  justificada: "bg-amber-400",
};

type ChamadaData = Awaited<ReturnType<typeof attendanceService.getChamada>>;

export function ChamadaPage() {
  const { showToast } = useToast();
  const [dateKey, setDateKey] = useState(() => nearestSaturday(getBrazilTodayKey()));
  // showToast still used for save errors below
  const [retryCount, setRetryCount] = useState(0);
  const [chamada, setChamada] = useState<ChamadaData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isError, setIsError] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    setIsError(false);
    setChamada(null);

    attendanceService
      .getChamada(dateKey)
      .then((data) => { if (!cancelled) setChamada(data); })
      .catch(() => { if (!cancelled) setIsError(true); })
      .finally(() => { if (!cancelled) setIsLoading(false); });

    return () => { cancelled = true; };
  }, [dateKey, retryCount]);

  async function handleStatusClick(athlete: ChamadaAthlete, status: ChamadaAttendanceStatus) {
    if (savingId === athlete.id || athlete.status === status) return;

    setSavingId(athlete.id);
    const previous = athlete.status;

    setChamada((prev) =>
      prev
        ? { ...prev, athletes: prev.athletes.map((a) => (a.id === athlete.id ? { ...a, status } : a)) }
        : prev,
    );

    try {
      await attendanceService.markChamadaBulk(dateKey, [{ athleteId: athlete.id, status }]);
    } catch {
      setChamada((prev) =>
        prev
          ? {
              ...prev,
              athletes: prev.athletes.map((a) => (a.id === athlete.id ? { ...a, status: previous } : a)),
            }
          : prev,
      );
      showToast("Erro ao salvar presença.", "error");
    } finally {
      setSavingId(null);
    }
  }

  const athletes = chamada?.athletes ?? [];
  const presentes = athletes.filter((a) => a.status === "presente").length;
  const faltas = athletes.filter((a) => a.status === "falta").length;
  const justificadas = athletes.filter((a) => a.status === "justificada").length;
  const naoMarcados = athletes.filter((a) => a.status === null).length;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-pegasus-navy">Chamada</h1>
        <p className="text-sm text-pegasus-medium">Registre a presença dos atletas no treino</p>
      </div>

      <div className="flex items-center gap-3 rounded-2xl border border-blue-100 bg-white px-5 py-4 shadow-soft">
        <button
          type="button"
          onClick={() => setDateKey((d) => addDays(d, -7))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 text-pegasus-medium transition hover:bg-pegasus-surface"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex-1 text-center">
          <p className="text-base font-bold capitalize text-pegasus-navy">{formatDateLong(dateKey)}</p>
          {chamada?.training && (
            <p className="mt-0.5 flex items-center justify-center gap-1 text-xs text-pegasus-medium">
              <MapPin size={12} />
              {chamada.training.local} · {chamada.training.horario}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={() => setDateKey((d) => addDays(d, 7))}
          className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-blue-100 text-pegasus-medium transition hover:bg-pegasus-surface"
        >
          <ChevronRight size={18} />
        </button>
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-pegasus-primary" size={28} />
        </div>
      ) : isError ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-rose-100 bg-rose-50 py-16 text-center shadow-soft">
          <AlertCircle className="text-rose-400" size={40} />
          <p className="font-bold text-pegasus-navy">Erro ao carregar chamada</p>
          <button
            type="button"
            onClick={() => setRetryCount((n) => n + 1)}
            className="text-sm font-semibold text-pegasus-primary underline underline-offset-2"
          >
            Tentar novamente
          </button>
        </div>
      ) : !chamada?.available ? (
        <div className="flex flex-col items-center justify-center gap-3 rounded-2xl border border-blue-100 bg-white py-16 text-center shadow-soft">
          <ClipboardList className="text-blue-200" size={40} />
          <p className="font-bold text-pegasus-navy">Sem treino nesta data</p>
          <p className="text-sm text-pegasus-medium">Navegue para um sábado de treino.</p>
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            <div className="rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-center">
              <p className="text-2xl font-black text-emerald-700">{presentes}</p>
              <p className="text-xs font-semibold text-emerald-600">Presentes</p>
            </div>
            <div className="rounded-2xl border border-rose-100 bg-rose-50 px-4 py-3 text-center">
              <p className="text-2xl font-black text-rose-700">{faltas}</p>
              <p className="text-xs font-semibold text-rose-600">Faltas</p>
            </div>
            <div className="rounded-2xl border border-amber-100 bg-amber-50 px-4 py-3 text-center">
              <p className="text-2xl font-black text-amber-700">{justificadas}</p>
              <p className="text-xs font-semibold text-amber-600">Justificadas</p>
            </div>
            <div className="rounded-2xl border border-blue-100 bg-pegasus-surface px-4 py-3 text-center">
              <p className="text-2xl font-black text-pegasus-navy">{naoMarcados}</p>
              <p className="text-xs font-semibold text-pegasus-medium">Não marcados</p>
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-blue-100 bg-white shadow-soft">
            <div className="flex items-center gap-2 border-b border-blue-50 px-5 py-3">
              <Users size={16} className="text-pegasus-medium" />
              <p className="text-sm font-semibold text-pegasus-navy">{athletes.length} atleta{athletes.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="divide-y divide-blue-50">
              {athletes.map((athlete) => (
                <div
                  key={athlete.id}
                  className="flex flex-col gap-2 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="flex min-w-0 items-center gap-3">
                    {savingId === athlete.id ? (
                      <Loader2 className="h-3 w-3 shrink-0 animate-spin text-pegasus-primary" />
                    ) : (
                      <span
                        className={`h-2.5 w-2.5 shrink-0 rounded-full ${
                          athlete.status ? STATUS_DOT[athlete.status] : "bg-slate-200"
                        }`}
                      />
                    )}
                    <div className="min-w-0">
                      <p className="truncate text-sm font-semibold text-pegasus-navy">{athlete.name}</p>
                      {athlete.category && (
                        <p className="text-xs text-pegasus-medium">{athlete.category}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 gap-1.5">
                    {(["presente", "falta", "justificada"] as ChamadaAttendanceStatus[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => handleStatusClick(athlete, s)}
                        disabled={savingId === athlete.id}
                        className={`rounded-xl px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                          athlete.status === s ? STATUS_CONFIG[s].active : STATUS_CONFIG[s].idle
                        }`}
                      >
                        {STATUS_CONFIG[s].label}
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
