import { fetchData, updateData, deleteData } from "@/lib/fetch-util";
import type { NotificationResponse } from "@/types";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useGetNotificationsQuery = (options?: {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}) => {
  const { page = 1, limit = 10, unreadOnly = false } = options || {};
  
  return useQuery<NotificationResponse>({
    queryKey: ["notifications", page, limit, unreadOnly],
    queryFn: async () => 
      fetchData<NotificationResponse>(`/notifications?page=${page}&limit=${limit}&unreadOnly=${unreadOnly}`),
    refetchInterval: 30000, // Refetch every 30 seconds for real-time updates
  });
};

export const useGetUnreadCountQuery = () => {
  return useQuery<{ unreadCount: number }>({
    queryKey: ["notifications", "unread-count"],
    queryFn: async () => fetchData<{ unreadCount: number }>("/notifications/unread-count"),
    refetchInterval: 15000, // Refetch every 15 seconds
  });
};

export const useMarkAsReadMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) =>
      updateData(`/notifications/${notificationId}/read`, {}),
    onSuccess: () => {
      // Invalidate notifications queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useMarkAllAsReadMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: () => updateData("/notifications/mark-all-read", {}),
    onSuccess: () => {
      // Invalidate notifications queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};

export const useDeleteNotificationMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (notificationId: string) =>
      deleteData(`/notifications/${notificationId}`),
    onSuccess: () => {
      // Invalidate notifications queries to refresh the data
      queryClient.invalidateQueries({ queryKey: ["notifications"] });
    },
  });
};
