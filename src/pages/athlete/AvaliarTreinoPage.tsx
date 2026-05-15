import { CheckCircle, Star } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { trainingFeedbackService } from "../../services/trainingFeedbackService";
import { trainingService, type Training } from "../../services/trainingService";

function StarRating({
  value,
  onChange,
}: {
  value: number;
  onChange: (v: number) => void;
}) {
  const [hover, setHover] = useState(0);

  return (
    <div className="flex gap-1">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          className="transition-transform hover:scale-110"
          key={star}
          onClick={() => onChange(star)}
          onMouseEnter={() => setHover(star)}
          onMouseLeave={() => setHover(0)}
          type="button"
        >
          <Star
            className={`${(hover || value) >= star ? "fill-amber-400 text-amber-400" : "text-slate-300"} transition-colors`}
            size={32}
          />
        </button>
      ))}
    </div>
  );
}

const ratingLabels = ["", "Ruim", "Regular", "Bom", "Ótimo", "Excelente"];

function formatDate(value: string) {
  return new Date(value).toLocaleDateString("pt-BR", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    timeZone: "UTC",
  });
}

export function AvaliarTreinoPage() {
  const { showToast } = useToast();
  const [trainings, setTrainings] = useState<Training[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedId, setSelectedId] = useState("");
  const [rating, setRating] = useState(0);
  const [comment, setComment] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [submittedIds, setSubmittedIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    async function load() {
      setIsLoading(true);
      try {
        const all = await trainingService.getAll();
        const past = all
          .filter((t) => new Date(t.date) < new Date())
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
          .slice(0, 20);
        setTrainings(past);
      } catch (error) {
        showToast(getApiErrorMessage(error), "error");
      } finally {
        setIsLoading(false);
      }
    }
    load();
  }, [showToast]);

  useEffect(() => {
    if (!selectedId) return;
    trainingFeedbackService.getMyFeedback(selectedId).then((fb) => {
      if (fb) {
        setRating(fb.rating);
        setComment(fb.comment ?? "");
      } else {
        setRating(0);
        setComment("");
      }
    });
  }, [selectedId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!selectedId || rating === 0) return;

    setIsSaving(true);
    try {
      await trainingFeedbackService.submit(selectedId, rating, comment);
      setSubmittedIds((prev) => new Set(prev).add(selectedId));
      showToast("Avaliação enviada! Obrigado pelo feedback.", "success");
      setSelectedId("");
      setRating(0);
      setComment("");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Avaliar Treino"
        description="Dê sua nota e compartilhe sua opinião sobre os treinos que você participou."
      />

      <div className="grid gap-6 xl:grid-cols-[1fr_440px]">
        <div className="panel divide-y divide-blue-50 overflow-hidden dark:divide-slate-700">
          <div className="p-5">
            <h2 className="font-bold text-pegasus-navy">Treinos recentes</h2>
            <p className="text-sm text-slate-500">Selecione um treino para avaliar.</p>
          </div>
          {isLoading ? (
            <p className="p-6 text-sm font-semibold text-slate-500">Carregando treinos...</p>
          ) : trainings.length === 0 ? (
            <p className="p-6 text-sm text-slate-500">Nenhum treino passado encontrado.</p>
          ) : (
            <div className="divide-y divide-blue-50 dark:divide-slate-700">
              {trainings.map((t) => (
                <button
                  className={`flex w-full items-center justify-between px-5 py-4 text-left transition ${
                    selectedId === t.id
                      ? "bg-pegasus-ice dark:bg-slate-700"
                      : "hover:bg-pegasus-ice dark:hover:bg-slate-700"
                  }`}
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  type="button"
                >
                  <div>
                    <p className="font-semibold text-pegasus-navy capitalize">{t.title}</p>
                    <p className="text-sm text-slate-500 capitalize">{formatDate(t.date)}</p>
                  </div>
                  {submittedIds.has(t.id) ? (
                    <CheckCircle className="text-emerald-500" size={18} />
                  ) : (
                    <Star className="text-slate-300" size={18} />
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {selectedId ? (
          <form className="panel h-fit p-6" onSubmit={handleSubmit}>
            <h2 className="font-bold text-pegasus-navy">
              {trainings.find((t) => t.id === selectedId)?.title}
            </h2>
            <p className="text-sm text-slate-500 capitalize">
              {formatDate(trainings.find((t) => t.id === selectedId)?.date ?? "")}
            </p>

            <div className="mt-6 space-y-6">
              <div>
                <p className="mb-3 text-sm font-semibold text-pegasus-navy">Sua nota</p>
                <StarRating onChange={setRating} value={rating} />
                {rating > 0 ? (
                  <p className="mt-2 text-sm font-bold text-amber-600">{ratingLabels[rating]}</p>
                ) : null}
              </div>

              <div>
                <label className="mb-1.5 block text-sm font-semibold text-pegasus-navy" htmlFor="fb-comment">
                  Comentário (opcional)
                </label>
                <textarea
                  className="w-full rounded-2xl border border-blue-100 bg-pegasus-surface px-4 py-3 text-sm outline-none transition focus:border-pegasus-primary focus:ring-2 focus:ring-pegasus-sky dark:border-slate-700 dark:bg-slate-900"
                  id="fb-comment"
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="O que achou do treino? Algo poderia ser diferente?"
                  rows={4}
                  value={comment}
                />
              </div>
            </div>

            <Button
              className="mt-6"
              disabled={isSaving || rating === 0}
              type="submit"
            >
              {isSaving ? "Enviando..." : "Enviar avaliação"}
            </Button>
          </form>
        ) : (
          <div className="panel flex flex-col items-center gap-3 p-10 text-center">
            <Star className="text-slate-200" size={40} />
            <p className="text-sm text-slate-500">Selecione um treino para avaliá-lo.</p>
          </div>
        )}
      </div>
    </div>
  );
}
