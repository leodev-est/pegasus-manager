import {
  Clapperboard,
  Instagram,
  Layers,
  ListTodo,
  MessageCircle,
  Palette,
  PartyPopper,
  Youtube,
} from "lucide-react";
import type { KanbanChannelOption, KanbanFormatOption } from "../../components/kanban/AdvancedKanban";
import type { MarketingFormat, MarketingStatus, MarketingTask } from "../../services/marketingService";

/**
 * Formato = "o que é" (como se produz). Cada formato tem sua esteira de sub-etapas,
 * mostrada no card enquanto ele está em Produção. "Tarefa solta" não tem esteira.
 */
export const MARKETING_FORMATS: Array<KanbanFormatOption & { value: MarketingFormat }> = [
  {
    value: "video",
    label: "Vídeo",
    icon: Clapperboard,
    stripClass: "bg-rose-400",
    chipClass: "bg-rose-50 text-rose-700 ring-rose-200 dark:bg-rose-950/40 dark:text-rose-300 dark:ring-rose-900",
    showChannel: true,
    stages: [
      { key: "roteiro", label: "Roteiro" },
      { key: "gravar", label: "Gravar" },
      { key: "editar", label: "Editar" },
      { key: "thumbnail", label: "Thumbnail" },
    ],
  },
  {
    value: "video_arte",
    label: "Vídeo + Arte",
    icon: Layers,
    stripClass: "bg-violet-400",
    chipClass: "bg-violet-50 text-violet-700 ring-violet-200 dark:bg-violet-950/40 dark:text-violet-300 dark:ring-violet-900",
    showChannel: true,
    stages: [
      { key: "roteiro", label: "Roteiro" },
      { key: "gravar", label: "Gravar" },
      { key: "editar", label: "Editar" },
      { key: "arte", label: "Arte" },
      { key: "thumbnail", label: "Thumbnail" },
    ],
  },
  {
    value: "arte",
    label: "Só Arte",
    icon: Palette,
    stripClass: "bg-sky-400",
    chipClass: "bg-sky-50 text-sky-700 ring-sky-200 dark:bg-sky-950/40 dark:text-sky-300 dark:ring-sky-900",
    showChannel: true,
    stages: [
      { key: "referencia", label: "Referência" },
      { key: "arte", label: "Arte" },
    ],
  },
  {
    value: "evento",
    label: "Evento",
    icon: PartyPopper,
    stripClass: "bg-amber-400",
    chipClass: "bg-amber-50 text-amber-700 ring-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:ring-amber-900",
    showChannel: true,
    stages: [
      { key: "planejar", label: "Planejar" },
      { key: "cobrir", label: "Cobrir" },
      { key: "editar", label: "Editar" },
      { key: "arte", label: "Arte" },
    ],
  },
  {
    value: "tarefa",
    label: "Tarefa solta",
    icon: ListTodo,
    stripClass: "bg-stone-300 dark:bg-slate-600",
    chipClass: "bg-stone-100 text-stone-600 ring-stone-200 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700",
    showChannel: false,
    stages: [],
  },
];

/** Colunas do quadro, na ordem do fluxo. Toda peça passa pela Revisão antes de Agendado/Publicado. */
export const MARKETING_COLUMNS: Array<{ label: string; value: MarketingStatus }> = [
  { label: "Ideias", value: "ideas" },
  { label: "Produção", value: "production" },
  { label: "Revisão", value: "review" },
  { label: "Agendado", value: "scheduled" },
  { label: "Publicado", value: "published" },
];

/** Canal = "onde vai" (plataforma). */
export const MARKETING_CHANNELS: KanbanChannelOption[] = [
  { value: "Instagram", label: "Instagram", icon: Instagram },
  { value: "YouTube", label: "YouTube", icon: Youtube },
  { value: "WhatsApp", label: "WhatsApp", icon: MessageCircle },
];

/** Dias na mesma coluna a partir dos quais o card fica destacado como parado. */
export const STALE_AFTER_DAYS: Partial<Record<MarketingStatus, number>> = {
  production: 5,
  review: 2,
};

/** Publicados há mais que isso ficam arquivados (ocultos por padrão). O backend usa o mesmo número. */
export const ARCHIVE_PUBLISHED_AFTER_DAYS = 30;

export function archiveStateOf(task: MarketingTask): "active" | "archived" | "auto" {
  if (task.archivedAt) return "archived";
  if (task.status !== "published") return "active";
  const since = Date.parse(task.statusChangedAt ?? task.updatedAt);
  return Date.now() - since > ARCHIVE_PUBLISHED_AFTER_DAYS * 86_400_000 ? "auto" : "active";
}

/** Sugestões ao cadastrar a função de cada pessoa (Controle de Acessos). */
export const MARKETING_FUNCTION_SUGGESTIONS = [
  "Chefe de marketing e social media",
  "Artes e design no Canva",
  "Curadoria de vídeos e organograma",
  "Eventos",
  "Edição de vídeos e social media",
  "Fotografia e edição de fotos",
];

const platformValues = new Set(MARKETING_CHANNELS.map((channel) => channel.value));
const legacyChannelFormat: Record<string, MarketingFormat> = { Arte: "arte", Evento: "evento" };
const legacyChannelLabel: Record<string, string> = { Captacao: "Captação" };

/**
 * Cards antigos usavam "Canal" para coisas que hoje são Formato (Arte, Evento) ou etiqueta
 * (Captação). Aqui eles são lidos no modelo novo; ao salvar, já ficam gravados assim.
 */
export function normalizeLegacyTask(task: MarketingTask): MarketingTask {
  const channel = task.channel ?? null;
  if (!channel || platformValues.has(channel)) return task;

  const legacyLabel = legacyChannelLabel[channel];
  const labels = legacyLabel && !task.labels.includes(legacyLabel) ? [...task.labels, legacyLabel] : task.labels;

  return {
    ...task,
    format: task.format ?? legacyChannelFormat[channel] ?? null,
    channel: null,
    labels,
  };
}
