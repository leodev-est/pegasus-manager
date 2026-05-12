import { Settings } from "lucide-react";
import { FormEvent, useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { Input } from "../../components/ui/Input";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { settingsService, type TrainingConfig } from "../../services/settingsService";

const defaultConfig: TrainingConfig = {
  trainingTime: "17:30 às 19:00",
  trainingLocation: "Jerusalém",
  trainingDependency: "Quadra - CREC",
  monthlyFeeAmount: 0,
};

export function ConfiguracoesPage() {
  const { showToast } = useToast();
  const [form, setForm] = useState<TrainingConfig>(defaultConfig);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    settingsService
      .getTrainingConfig()
      .then((config) => setForm(config))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setIsSaving(true);

    try {
      const updated = await settingsService.updateTrainingConfig(form);
      setForm(updated);
      showToast("Configurações salvas com sucesso.", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Configurações"
        description="Parâmetros gerais do projeto: horário e local dos treinos, valor da mensalidade."
      />

      <section className="panel p-6">
        <div className="mb-6 flex items-center gap-3 border-b border-blue-100 pb-6">
          <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
            <Settings size={20} />
          </span>
          <div>
            <h2 className="text-xl font-bold text-pegasus-navy">Parâmetros de Treino</h2>
            <p className="text-sm text-slate-500">Configurações exibidas no calendário e usadas no sistema.</p>
          </div>
        </div>

        {isLoading ? (
          <p className="text-sm text-slate-500">Carregando configurações...</p>
        ) : (
          <form className="grid gap-5 md:grid-cols-2" onSubmit={handleSubmit}>
            <Input
              disabled={isSaving}
              label="Horário do treino"
              onChange={(e) => setForm({ ...form, trainingTime: e.target.value })}
              placeholder="Ex: 17:30 às 19:00"
              value={form.trainingTime}
            />
            <Input
              disabled={isSaving}
              label="Local do treino"
              onChange={(e) => setForm({ ...form, trainingLocation: e.target.value })}
              placeholder="Ex: Jerusalém"
              value={form.trainingLocation}
            />
            <Input
              disabled={isSaving}
              label="Dependência"
              onChange={(e) => setForm({ ...form, trainingDependency: e.target.value })}
              placeholder="Ex: Quadra - CREC"
              value={form.trainingDependency}
            />
            <Input
              disabled={isSaving}
              label="Valor da mensalidade (R$)"
              min="0"
              onChange={(e) => setForm({ ...form, monthlyFeeAmount: Number(e.target.value) })}
              step="0.01"
              type="number"
              value={form.monthlyFeeAmount}
            />

            <div className="flex flex-col gap-3 sm:flex-row md:col-span-2">
              <Button disabled={isSaving} type="submit">
                {isSaving ? "Salvando..." : "Salvar configurações"}
              </Button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
