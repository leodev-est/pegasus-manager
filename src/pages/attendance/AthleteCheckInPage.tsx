import { CalendarCheck, CheckCircle2, Loader2, MapPin } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { attendanceService, type TodayCheckIn } from "../../services/attendanceService";
import { formatDateLong, formatTime } from "./attendanceUi";

export function AthleteCheckInPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<TodayCheckIn | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  const loadCheckIn = useCallback(async () => {
    setIsLoading(true);

    try {
      setData(await attendanceService.getTodayCheckIn());
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    loadCheckIn();
  }, [loadCheckIn]);

  async function handleCheckIn() {
    if (!data?.training) return;
    setIsSaving(true);

    try {
      await attendanceService.checkIn(data.training.id);
      showToast("Presença confirmada. Bom treino!", "success");
      await loadCheckIn();
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Check-in"
        description="Confirme sua presença no treino do dia pelo celular ou computador."
      />

      {isLoading ? (
        <section className="panel flex items-center gap-3 p-6 text-sm font-bold text-pegasus-primary">
          <Loader2 className="animate-spin" size={18} />
          Carregando check-in
        </section>
      ) : (
        <section className="panel overflow-hidden">
          <div className="bg-pegasus-navy p-6 text-white sm:p-8">
            <div className="flex items-center gap-3">
              <span className="grid h-12 w-12 place-items-center rounded-2xl bg-white/10">
                <CalendarCheck size={24} />
              </span>
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-blue-100">
                  Check-in do treino
                </p>
                <h2 className="text-2xl font-black">Hoje</h2>
              </div>
            </div>
          </div>

          <div className="space-y-6 p-5 sm:p-8">
            {!data?.available || !data.training ? (
              <div className="rounded-2xl bg-pegasus-surface p-5 text-center">
                <p className="font-black text-pegasus-navy">Não há treino disponível para check-in hoje.</p>
                <p className="mt-2 text-sm text-slate-500">Quando houver treino oficial, o botão aparece aqui.</p>
              </div>
            ) : (
              <>
                <div className="grid gap-3 sm:grid-cols-3">
                  <div className="rounded-2xl bg-pegasus-surface p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-pegasus-primary">Data</p>
                    <p className="mt-1 font-black text-pegasus-navy">{formatDateLong(data.training.date)}</p>
                  </div>
                  <div className="rounded-2xl bg-pegasus-surface p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-pegasus-primary">Horário</p>
                    <p className="mt-1 font-black text-pegasus-navy">{data.training.horario}</p>
                  </div>
                  <div className="rounded-2xl bg-pegasus-surface p-4">
                    <p className="text-xs font-black uppercase tracking-[0.12em] text-pegasus-primary">Local</p>
                    <p className="mt-1 inline-flex items-center gap-2 font-black text-pegasus-navy">
                      <MapPin size={16} />
                      {data.training.local}
                    </p>
                  </div>
                </div>

                {data.checkedIn ? (
                  <div className="rounded-2xl border border-emerald-100 bg-emerald-50 p-5">
                    <div className="flex items-center gap-3">
                      <CheckCircle2 className="text-emerald-700" size={24} />
                      <div>
                        <p className="font-black text-emerald-800">Presença confirmada</p>
                        <p className="text-sm text-emerald-700">
                          Check-in feito às {formatTime(data.attendance?.checkedInAt)}.
                        </p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <StatusBadge label="Presente" tone="success" />
                    </div>
                  </div>
                ) : (
                  <Button
                    className="min-h-16 w-full text-base"
                    disabled={isSaving}
                    onClick={handleCheckIn}
                  >
                    {isSaving ? <Loader2 className="animate-spin" size={20} /> : <CheckCircle2 size={22} />}
                    Marcar presença
                  </Button>
                )}
              </>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
