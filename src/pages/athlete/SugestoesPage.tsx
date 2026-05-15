import { MessageSquarePlus, Send } from "lucide-react";
import { useState } from "react";
import { Button } from "../../components/ui/Button";
import { PageHeader } from "../../components/ui/PageHeader";
import { useToast } from "../../components/ui/Toast";
import { getApiErrorMessage } from "../../services/api";
import { suggestionService } from "../../services/suggestionService";

export function SugestoesPage() {
  const { showToast } = useToast();
  const [message, setMessage] = useState("");
  const [anonymous, setAnonymous] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim()) return;

    setIsSending(true);
    try {
      await suggestionService.submit({ message: message.trim(), anonymous });
      setSent(true);
      setMessage("");
      showToast("Sugestão enviada com sucesso!", "success");
    } catch (error) {
      showToast(getApiErrorMessage(error), "error");
    } finally {
      setIsSending(false);
    }
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Caixinha de Sugestões"
        description="Compartilhe ideias, críticas ou sugestões para melhorar o Pegasus."
      />

      {sent ? (
        <div className="panel p-8 text-center">
          <span className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
            <MessageSquarePlus size={32} />
          </span>
          <h2 className="text-xl font-bold text-pegasus-navy">Sugestão enviada!</h2>
          <p className="mt-2 text-sm text-slate-500">
            Obrigado pela sua contribuição. A equipe de RH receberá sua mensagem.
          </p>
          <Button
            className="mt-6"
            onClick={() => setSent(false)}
          >
            Enviar outra
          </Button>
        </div>
      ) : (
        <form className="panel p-6" onSubmit={handleSubmit}>
          <div className="flex items-center gap-3">
            <span className="rounded-2xl bg-pegasus-ice p-3 text-pegasus-primary">
              <MessageSquarePlus size={22} />
            </span>
            <div>
              <h2 className="text-xl font-bold text-pegasus-navy">Nova sugestão</h2>
              <p className="text-sm text-slate-500">Sem limite de caracteres. Seja sincero!</p>
            </div>
          </div>

          <div className="mt-6 space-y-4">
            <div>
              <label className="mb-1.5 block text-sm font-semibold text-pegasus-navy" htmlFor="suggestion-message">
                Sua mensagem
              </label>
              <textarea
                className="w-full rounded-2xl border border-blue-100 bg-pegasus-surface px-4 py-3 text-sm text-pegasus-navy outline-none transition placeholder:text-slate-400 focus:border-pegasus-primary focus:ring-2 focus:ring-pegasus-sky dark:border-slate-700 dark:bg-slate-900"
                id="suggestion-message"
                minLength={5}
                onChange={(e) => setMessage(e.target.value)}
                placeholder="Escreva sua sugestão, crítica ou ideia..."
                required
                rows={8}
                value={message}
              />
            </div>

            <label className="flex cursor-pointer items-center gap-3 rounded-2xl border border-blue-100 p-4 transition hover:bg-pegasus-ice dark:border-slate-700 dark:hover:bg-slate-800">
              <input
                checked={anonymous}
                className="h-4 w-4 accent-pegasus-primary"
                onChange={(e) => setAnonymous(e.target.checked)}
                type="checkbox"
              />
              <div>
                <p className="text-sm font-semibold text-pegasus-navy">Enviar anonimamente</p>
                <p className="text-xs text-slate-500">Seu nome não será associado a esta mensagem.</p>
              </div>
            </label>
          </div>

          <Button
            className="mt-6"
            disabled={isSending || !message.trim()}
            type="submit"
          >
            <Send size={16} />
            {isSending ? "Enviando..." : "Enviar sugestão"}
          </Button>
        </form>
      )}
    </div>
  );
}
