/**
 * Pipeline da Pauta de Conteúdo — espelho de backend/src/modules/marketing/marketing.shared.ts.
 * Mantenha os dois iguais.
 *
 * `status` do item = última etapa CONCLUÍDA. A próxima etapa do formato é a pendente.
 */
export type ContentStatus =
  | "referencia"
  | "definido"
  | "arte"
  | "foto"
  | "aprovado"
  | "gravado"
  | "editado"
  | "cobertura"
  | "postado";
export type ContentFormat = "video" | "video_arte" | "so_arte" | "foto" | "evento";
export type MarketingFunction = "chefe" | "social" | "arte" | "edicao" | "curadoria" | "eventos" | "fotografia";

export const STEP_LABEL: Record<ContentStatus, string> = {
  referencia: "Referência",
  definido: "Definido",
  arte: "Arte",
  foto: "Foto (captura e edição)",
  aprovado: "Aprovado",
  gravado: "Gravado",
  editado: "Editado",
  cobertura: "Cobertura",
  postado: "Postado",
};

export const FORMAT_OPTIONS: Array<{ value: ContentFormat; label: string }> = [
  { value: "video", label: "Vídeo" },
  { value: "video_arte", label: "Vídeo + arte" },
  { value: "so_arte", label: "Só arte (post ou story)" },
  { value: "foto", label: "Foto" },
  { value: "evento", label: "Evento" },
];

export const FORMAT_SHORT: Record<ContentFormat, string> = {
  video: "Vídeo",
  video_arte: "Vídeo + arte",
  so_arte: "Só arte",
  foto: "Foto",
  evento: "Evento",
};

const PIPELINES: Record<ContentFormat, ContentStatus[]> = {
  video: ["referencia", "definido", "gravado", "editado", "postado"],
  video_arte: ["referencia", "definido", "arte", "gravado", "editado", "postado"],
  so_arte: ["referencia", "definido", "arte", "postado"],
  foto: ["referencia", "definido", "foto", "aprovado", "postado"],
  evento: ["referencia", "definido", "arte", "cobertura", "postado"],
};

export function pipelineFor(format: ContentFormat | string | undefined): ContentStatus[] {
  return PIPELINES[(format as ContentFormat) in PIPELINES ? (format as ContentFormat) : "video"];
}

/** Próxima etapa pendente (null se já foi postado). */
export function nextStep(format: ContentFormat | string, status: ContentStatus): ContentStatus | null {
  const pipeline = pipelineFor(format);
  const idx = pipeline.indexOf(status);
  if (idx < 0 || idx >= pipeline.length - 1) return null;
  return pipeline[idx + 1];
}

/** Se o status não existe no formato novo, volta pra "definido" (igual ao backend). */
export function normalizeStatusForFormat(format: ContentFormat, status: ContentStatus): ContentStatus {
  return pipelineFor(format).includes(status) ? status : "definido";
}

export const FUNCTION_OPTIONS: Array<{ value: MarketingFunction; label: string }> = [
  { value: "chefe", label: "Chefe de marketing" },
  { value: "social", label: "Social media" },
  { value: "arte", label: "Artes / Design" },
  { value: "edicao", label: "Edição de vídeo" },
  { value: "curadoria", label: "Curadoria" },
  { value: "eventos", label: "Eventos" },
  { value: "fotografia", label: "Fotografia" },
];

export const FUNCTION_LABEL: Record<string, string> = Object.fromEntries(FUNCTION_OPTIONS.map((o) => [o.value, o.label]));

/** Etapas PENDENTES de que cada função cuida (espelho do backend). */
export const FUNCTION_STEPS: Record<MarketingFunction, ContentStatus[]> = {
  chefe: ["definido", "aprovado"],
  curadoria: ["definido"],
  arte: ["arte"],
  edicao: ["editado"],
  social: ["postado"],
  eventos: ["cobertura"],
  fotografia: ["foto"],
};

export function stepsHandledBy(functions: string[] | undefined): ContentStatus[] {
  const steps = new Set<ContentStatus>();
  for (const fn of functions ?? []) {
    for (const step of FUNCTION_STEPS[fn as MarketingFunction] ?? []) steps.add(step);
  }
  return Array.from(steps);
}

export type PautaFilter = "todos" | "meus" | "fila" | "vindo";

export const FILTER_LABEL: Record<PautaFilter, string> = {
  todos: "Todos",
  meus: "Meus",
  fila: "Na minha fila",
  vindo: "Vindo aí",
};

type FilterableItem = { assignedTo: string[]; format: ContentFormat | string; status: ContentStatus };

export function isMine(item: { assignedTo: string[] }, userName: string | undefined) {
  if (!userName) return false;
  const me = userName.trim().toLowerCase();
  return item.assignedTo.some((name) => name.trim().toLowerCase() === me);
}

/**
 * - meus: atribuído a mim
 * - fila: a PRÓXIMA etapa pendente é de uma função minha (de qualquer responsável)
 * - vindo: ainda vai chegar na minha etapa (a pendente é uma etapa ANTERIOR à minha no caminho do item)
 */
export function matchesPautaFilter(
  item: FilterableItem,
  filter: PautaFilter,
  me: { name?: string; functions?: string[] },
): boolean {
  if (filter === "todos") return true;
  if (filter === "meus") return isMine(item, me.name);

  const handled = stepsHandledBy(me.functions);
  const next = nextStep(item.format, item.status);
  if (!next || handled.length === 0) return false;

  if (filter === "fila") return handled.includes(next);

  const pipeline = pipelineFor(item.format);
  const myIdxs = handled.map((s) => pipeline.indexOf(s)).filter((i) => i >= 0);
  if (myIdxs.length === 0) return false;
  return pipeline.indexOf(next) < Math.min(...myIdxs);
}
