import { useQuery, useQueryClient } from "@tanstack/react-query";
import { athleteService, type AthleteFilters } from "../services/athleteService";

export const ATHLETES_KEY = "athletes";

function normalizeKey(filters?: AthleteFilters) {
  if (!filters) return null;
  const { search, status, category, monthlyPaymentStatus } = filters;
  if (!search && !status && !category && !monthlyPaymentStatus) return null;
  return filters;
}

export function useAthletes(filters?: AthleteFilters, options?: { enabled?: boolean }) {
  return useQuery({
    queryKey: [ATHLETES_KEY, normalizeKey(filters)],
    queryFn: () => athleteService.getAll(filters),
    staleTime: 60_000,
    enabled: options?.enabled ?? true,
  });
}

export function useInvalidateAthletes() {
  const queryClient = useQueryClient();
  return () => queryClient.invalidateQueries({ queryKey: [ATHLETES_KEY] });
}
