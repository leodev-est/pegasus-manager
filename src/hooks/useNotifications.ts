import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { notificationService, type Notification } from "../services/notificationService";

export const NOTIFICATIONS_KEY = "notifications";

export function useNotifications() {
  return useQuery({
    queryKey: [NOTIFICATIONS_KEY],
    queryFn: () => notificationService.getNotifications(),
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => notificationService.markAsRead(id),
    onSuccess: (updated) => {
      queryClient.setQueryData<Notification[]>([NOTIFICATIONS_KEY], (current) =>
        current ? current.map((n) => (n.id === updated.id ? updated : n)) : current,
      );
    },
  });
}

export function useMarkAllAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => notificationService.markAllAsRead(),
    onSuccess: (data) => {
      queryClient.setQueryData([NOTIFICATIONS_KEY], data);
    },
  });
}
