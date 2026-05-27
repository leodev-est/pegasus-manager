import { Activity, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { injuryService, type Injury } from "../../services/injuryService";

const TYPE_LABELS: Record<string, string> = {
  muscular: "Muscular",
  articular: "Articular",
  óssea: "Óssea",
  tendão: "Tendão",
  outro: "Outro",
};

const SEVERITY_CONFIG: Record<string, { label: string; color: string }> = {
  leve: { label: "Leve", color: "bg-amber-100 text-amber-700" },
  moderada: { label: "Moderada", color: "bg-orange-100 text-orange-700" },
  grave: { label: "Grave", color: "bg-rose-100 text-rose-700" },
};

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

export function MinhasLesoesPage() {
  const [injuries, setInjuries] = useState<Injury[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    injuryService.listMine()
      .then(setInjuries)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  const active = injuries.filter((i) => !i.returnedAt);
  const recovered = injuries.filter((i) => Boolean(i.returnedAt));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Minha Saúde"
        description="Histórico de lesões e afastamentos."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-pegasus-primary" size={28} />
        </div>
      ) : injuries.length === 0 ? (
        <EmptyState icon={Activity} title="Sem lesões registradas" description="Nenhum histórico de lesão encontrado." />
      ) : (
        <>
          {active.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-black text-pegasus-navy">Lesões ativas</h2>
              {active.map((injury) => (
                <div key={injury.id} className="panel border-l-4 border-rose-400 p-5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SEVERITY_CONFIG[injury.severity]?.color ?? "bg-slate-100 text-slate-600"}`}>
                      {SEVERITY_CONFIG[injury.severity]?.label ?? injury.severity}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {TYPE_LABELS[injury.type] ?? injury.type}
                    </span>
                    <span className="rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-bold text-rose-600">
                      Afastado
                    </span>
                  </div>
                  {injury.description && (
                    <p className="mt-2 text-sm text-pegasus-navy">{injury.description}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    Início: {formatDate(injury.startDate)}
                    {injury.expectedReturn ? ` · Retorno previsto: ${formatDate(injury.expectedReturn)}` : ""}
                  </p>
                  {injury.notes && (
                    <p className="mt-1 text-xs text-slate-500">{injury.notes}</p>
                  )}
                </div>
              ))}
            </section>
          )}

          {recovered.length > 0 && (
            <section className="space-y-3">
              <h2 className="font-black text-pegasus-navy">Histórico (recuperado)</h2>
              {recovered.map((injury) => (
                <div key={injury.id} className="panel p-5 opacity-80">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${SEVERITY_CONFIG[injury.severity]?.color ?? "bg-slate-100 text-slate-600"}`}>
                      {SEVERITY_CONFIG[injury.severity]?.label ?? injury.severity}
                    </span>
                    <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">
                      {TYPE_LABELS[injury.type] ?? injury.type}
                    </span>
                    <span className="rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-600">
                      Recuperado
                    </span>
                  </div>
                  {injury.description && (
                    <p className="mt-2 text-sm text-pegasus-navy">{injury.description}</p>
                  )}
                  <p className="mt-2 text-xs text-slate-400">
                    {formatDate(injury.startDate)} → {formatDate(injury.returnedAt)}
                  </p>
                </div>
              ))}
            </section>
          )}
        </>
      )}
    </div>
  );
}
