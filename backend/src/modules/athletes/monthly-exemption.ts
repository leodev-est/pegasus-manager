const exemptMonthlyPaymentNames = [
  "leonardo silva",
  "giulia alves",
  "allef gois",
  "victoria tenorio",
  "vitor souza",
];

function normalizeName(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .replace(/\s+/g, " ")
    .trim();
}

export function isMonthlyPaymentExempt(name?: string | null) {
  if (!name) return false;

  const normalizedName = normalizeName(name);

  return exemptMonthlyPaymentNames.some((exemptName) => {
    const normalizedExemptName = normalizeName(exemptName);
    return normalizedName === normalizedExemptName || normalizedName.includes(normalizedExemptName);
  });
}

export function getMonthlyPaymentStatusForAthlete(
  name?: string | null,
  fallback: string = "pendente",
) {
  if (isMonthlyPaymentExempt(name)) {
    return "isento";
  }

  return fallback === "isento" ? "pendente" : fallback;
}
