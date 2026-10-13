import { randomUUID } from "crypto";
import { AppError } from "../../middlewares/error.middleware";

/**
 * Pipeline da Pauta de Conteúdo.
 * `status` = última etapa CONCLUÍDA; a próxima etapa do `format` é o que está pendente.
 * (Espelhado no frontend em src/utils/contentPipeline.ts — mantenha os dois iguais.)
 */
export const CONTENT_STEPS = ["referencia", "definido", "arte", "foto", "aprovado", "gravado", "editado", "cobertura", "postado"] as const;
export type ContentStep = (typeof CONTENT_STEPS)[number];

export const CONTENT_FORMATS = ["video", "video_arte", "so_arte", "foto", "evento"] as const;
export type ContentFormat = (typeof CONTENT_FORMATS)[number];

const PIPELINES: Record<ContentFormat, readonly ContentStep[]> = {
  video: ["referencia", "definido", "gravado", "editado", "postado"],
  video_arte: ["referencia", "definido", "arte", "gravado", "editado", "postado"],
  so_arte: ["referencia", "definido", "arte", "postado"],
  // "foto" = captura + edição da foto (feita pela mesma pessoa); "aprovado" = chefe aprova antes de postar.
  foto: ["referencia", "definido", "foto", "aprovado", "postado"],
  // "evento" = card de cobertura de marketing pro evento (convite/arte, divulgação, cobertura no dia).
  evento: ["referencia", "definido", "arte", "cobertura", "postado"],
};

export function isContentFormat(value: unknown): value is ContentFormat {
  return typeof value === "string" && (CONTENT_FORMATS as readonly string[]).includes(value);
}

export function isContentStep(value: unknown): value is ContentStep {
  return typeof value === "string" && (CONTENT_STEPS as readonly string[]).includes(value);
}

export function pipelineFor(format: string): readonly ContentStep[] {
  return isContentFormat(format) ? PIPELINES[format] : PIPELINES.video;
}

/** Próxima etapa pendente do item (null se já está em "postado"). */
export function nextStep(format: string, status: string): ContentStep | null {
  const pipeline = pipelineFor(format);
  const idx = pipeline.indexOf(status as ContentStep);
  if (idx < 0 || idx >= pipeline.length - 1) return null;
  return pipeline[idx + 1];
}

/**
 * Se o status não existe no pipeline do formato (ex.: item em "gravado" virou "só arte"),
 * volta pra "definido" — o ponto seguro: nada do formato novo foi feito ainda.
 */
export function normalizeStatusForFormat(format: string, status: string): ContentStep {
  const pipeline = pipelineFor(format);
  return pipeline.includes(status as ContentStep) ? (status as ContentStep) : "definido";
}

/** Funções do time de marketing (campo User.marketingFunctions). */
export const MARKETING_FUNCTIONS = ["chefe", "social", "arte", "edicao", "curadoria", "eventos", "fotografia"] as const;
export type MarketingFunction = (typeof MARKETING_FUNCTIONS)[number];

/**
 * Etapas PENDENTES de que cada função cuida. Ajuste aqui se o time dividir o trabalho
 * de outro jeito (ex.: se alguém específico grava, mapear "gravado" pra uma função).
 * Espelhado no frontend em src/utils/contentPipeline.ts.
 */
export const FUNCTION_STEPS: Record<MarketingFunction, readonly ContentStep[]> = {
  chefe: ["definido", "aprovado"],
  curadoria: ["definido"],
  arte: ["arte"],
  edicao: ["editado"],
  social: ["postado"],
  eventos: ["cobertura"],
  fotografia: ["foto"],
};

export function functionsForStep(step: ContentStep): MarketingFunction[] {
  return MARKETING_FUNCTIONS.filter((fn) => FUNCTION_STEPS[fn].includes(step));
}

export type LinkItem = { id: string; label: string; url: string };

/** Valida a lista de links (Canva, Drive, vídeo...). Só http(s), no máximo 10. */
export function normalizeLinks(value: unknown): LinkItem[] | undefined {
  if (value === undefined) return undefined;
  if (!Array.isArray(value)) throw new AppError("Links devem ser uma lista", 400);
  if (value.length > 10) throw new AppError("No máximo 10 links por item", 400);

  return value.map((raw) => {
    const item = raw as Partial<LinkItem>;
    const url = typeof item.url === "string" ? item.url.trim() : "";
    let parsed: URL;
    try {
      parsed = new URL(url);
    } catch {
      throw new AppError(`Link inválido: ${url || "(vazio)"}`, 400);
    }
    if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
      throw new AppError("Links devem começar com http:// ou https://", 400);
    }
    const label = typeof item.label === "string" && item.label.trim() ? item.label.trim().slice(0, 60) : parsed.hostname;
    const id = typeof item.id === "string" && item.id ? item.id : randomUUID();
    return { id, label, url: parsed.toString() };
  });
}

export function normalizeNameList(value?: string[] | null) {
  if (!value) return [];
  return Array.from(new Set(value.map((name) => String(name).trim()).filter(Boolean)));
}
