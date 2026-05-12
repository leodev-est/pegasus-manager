export const OFFICIAL_TRAINING = {
  time: "17:30 às 19:00",
  location: "Jerusalém",
  dependency: "Quadra - CREC",
  modality: "Voleibol",
} as const;

// Datas fixas bloqueadas manualmente — não configuráveis via UI.
// Alterar aqui e em backend/src/utils/trainingDates.ts quando necessário.
export const MANUAL_BLOCKED_DATES: readonly string[] = [
  "2026-05-30",
  "2026-06-20",
  "2026-09-26",
];
