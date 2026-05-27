import { ClipboardList, Loader2 } from "lucide-react";
import { useEffect, useState } from "react";
import { EmptyState } from "../../components/ui/EmptyState";
import { PageHeader } from "../../components/ui/PageHeader";
import { trainingPlanService, type TrainingPlan } from "../../services/trainingPlanService";
import { useTour } from "../../tours/useTour";

function formatDate(value: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat("pt-BR", { timeZone: "UTC" }).format(new Date(value));
}

const TOUR_STEPS = [
  {
    element: "[data-tour='plano-header']",
    popover: {
      title: "📋 Seu plano ativo",
      description: "Este é o plano de treino que o treinador criou especificamente para você. Aqui aparecem o título, quem criou e o período de validade do plano.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='plano-objetivos']",
    popover: {
      title: "Objetivos do plano",
      description: "O treinador define metas específicas que você deve alcançar com este plano. Leia com atenção para entender o foco do seu treinamento.",
      side: "bottom" as const,
    },
  },
  {
    element: "[data-tour='plano-exercicios']",
    popover: {
      title: "Lista de exercícios",
      description: "Cada exercício mostra o nome, quantas séries fazer, quantas repetições por série e observações importantes do treinador. Siga à risca!",
      side: "top" as const,
    },
  },
];

export function MeuPlanoPage() {
  const [plan, setPlan] = useState<TrainingPlan | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    trainingPlanService.getMine()
      .then(setPlan)
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  useTour("meu-plano:v1", isLoading || !plan ? [] : TOUR_STEPS);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Meu Plano de Treino"
        description="Seu plano de treino individual atual."
      />

      {isLoading ? (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-pegasus-primary" size={28} />
        </div>
      ) : !plan ? (
        <EmptyState
          icon={ClipboardList}
          title="Sem plano ativo"
          description="Nenhum plano de treino ativo foi criado para você ainda."
        />
      ) : (
        <div className="space-y-6">
          <div data-tour="plano-header" className="rounded-3xl bg-pegasus-navy p-6 text-white">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="text-xs font-semibold uppercase tracking-widest text-blue-200">Plano ativo</p>
                <h2 className="mt-1 text-2xl font-black">{plan.title}</h2>
                {(plan.startDate || plan.endDate) && (
                  <p className="mt-1 text-sm text-blue-200">
                    {formatDate(plan.startDate)}
                    {plan.startDate && plan.endDate ? " → " : ""}
                    {formatDate(plan.endDate)}
                  </p>
                )}
              </div>
              {plan.createdBy && (
                <span className="rounded-2xl bg-white/10 px-3 py-1 text-sm text-blue-100">
                  {plan.createdBy}
                </span>
              )}
            </div>
          </div>

          {plan.description && (
            <div className="panel p-5">
              <h3 className="mb-2 font-black text-pegasus-navy">Descrição</h3>
              <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{plan.description}</p>
            </div>
          )}

          {plan.goals && (
            <div data-tour="plano-objetivos" className="panel p-5">
              <h3 className="mb-2 font-black text-pegasus-navy">Objetivos</h3>
              <p className="text-sm leading-relaxed text-slate-600 whitespace-pre-wrap">{plan.goals}</p>
            </div>
          )}

          {plan.exercises && plan.exercises.length > 0 && (
            <section data-tour="plano-exercicios" className="panel overflow-hidden">
              <div className="border-b border-blue-100 p-5">
                <h3 className="font-black text-pegasus-navy">Exercícios ({plan.exercises.length})</h3>
              </div>
              <div className="divide-y divide-blue-50">
                {plan.exercises.map((ex, idx) => (
                  <div key={idx} className="flex flex-col gap-1 px-5 py-4 sm:flex-row sm:items-start sm:gap-4">
                    <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-pegasus-primary text-xs font-black text-white">
                      {idx + 1}
                    </span>
                    <div className="flex-1">
                      <p className="font-bold text-pegasus-navy">{ex.name}</p>
                      <p className="mt-0.5 text-sm text-slate-500">
                        {ex.sets} série{Number(ex.sets) !== 1 ? "s" : ""} × {ex.reps}
                      </p>
                      {ex.notes && (
                        <p className="mt-1 text-xs text-slate-400">{ex.notes}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </section>
          )}
        </div>
      )}
    </div>
  );
}
