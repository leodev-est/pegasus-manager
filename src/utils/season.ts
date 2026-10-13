export type SeasonKey = "halloween" | "christmas";

export type SeasonInfo = {
  key: SeasonKey;
  emoji: string;
  greeting: string;
};

const SEASONS: Record<SeasonKey, SeasonInfo> = {
  halloween: { key: "halloween", emoji: "🎃", greeting: "Feliz Halloween!" },
  christmas: { key: "christmas", emoji: "🎄", greeting: "Feliz Natal!" },
};

/**
 * Detalhe sazonal discreto (emoji + saudação) pra outubro (Halloween) e dezembro (Natal).
 * `null` no resto do ano. Pra adicionar outra data, só incluir o mês aqui.
 */
export function getActiveSeason(date: Date = new Date()): SeasonInfo | null {
  const month = date.getMonth();
  if (month === 9) return SEASONS.halloween;
  if (month === 11) return SEASONS.christmas;
  return null;
}
