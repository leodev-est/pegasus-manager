import { MessageCircle } from "lucide-react";
import { Button } from "../ui/Button";

type ShareToGroupButtonProps = {
  /** Mensagem pronta que vai pro WhatsApp. */
  text: string;
  disabled?: boolean;
};

/**
 * Abre o WhatsApp com a mensagem pronta; a pessoa só escolhe o grupo e envia.
 * (Não existe link que escolha um grupo específico — o WhatsApp não permite.)
 */
export function ShareToGroupButton({ text, disabled }: ShareToGroupButtonProps) {
  function share() {
    const url = `https://wa.me/?text=${encodeURIComponent(text)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  }

  return (
    <Button disabled={disabled || !text.trim()} onClick={share} type="button" variant="secondary">
      <MessageCircle size={16} />
      Avisar no grupo
    </Button>
  );
}

function formatDate(iso: string) {
  const [y, m, d] = iso.slice(0, 10).split("-");
  return y && m && d ? `${d}/${m}` : iso;
}

function linkLines(links: Array<{ label: string; url: string }>) {
  return links.length > 0 ? ["", ...links.map((link) => `🔗 ${link.label}: ${link.url}`)] : [];
}

export function buildPautaMessage(input: {
  title: string;
  date: string;
  stepLabel: string;
  nextLabel: string | null;
  assignedTo: string[];
  links: Array<{ label: string; url: string }>;
}) {
  return [
    `📌 *${input.title}* (${formatDate(input.date)})`,
    input.nextLabel ? `Agora: ${input.stepLabel} → falta ${input.nextLabel}` : `Etapa: ${input.stepLabel} ✅`,
    input.assignedTo.length > 0 ? `Responsáveis: ${input.assignedTo.join(", ")}` : "",
    ...linkLines(input.links),
  ]
    .filter((line, index, all) => line !== "" || (index > 0 && all[index - 1] !== ""))
    .join("\n")
    .trim();
}

export function buildEventMessage(input: {
  name: string;
  date: string;
  location: string;
  assignedTo: string[];
  links: Array<{ label: string; url: string }>;
}) {
  return [
    `📅 *${input.name}* (${formatDate(input.date)})`,
    input.location ? `📍 ${input.location}` : "",
    input.assignedTo.length > 0 ? `Responsáveis: ${input.assignedTo.join(", ")}` : "",
    ...linkLines(input.links),
  ]
    .filter((line, index, all) => line !== "" || (index > 0 && all[index - 1] !== ""))
    .join("\n")
    .trim();
}
