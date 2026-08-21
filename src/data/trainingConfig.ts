// Fallback "legado" — só usado em telas que ainda não buscam a Turma real
// (ex: perfil do atleta antes do primeiro carregamento). O horário/local reais
// de cada turma ficam em Turmas (backend/frontend), configuráveis pelo admin.
export const OFFICIAL_TRAINING = {
  time: "17:30 às 19:00",
  location: "Rua Lazara de Oliveira Leite, 200 - Jerusalém",
  dependency: "Quadra - CREC",
  modality: "Voleibol",
} as const;

export const MANUAL_BLOCKED_DATES: readonly string[] = [];
