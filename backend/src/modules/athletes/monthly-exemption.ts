export function isMonthlyPaymentExempt(_name?: string | null) {
  return false;
}

export function getMonthlyPaymentStatusForAthlete(
  _name?: string | null,
  fallback: string = "pendente",
) {
  return fallback;
}
