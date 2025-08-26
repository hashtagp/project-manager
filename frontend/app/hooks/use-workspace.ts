import type { WorkspaceForm } from "@/components/workspace/create-workspace";
import type { Workspace } from "@/types";
import { fetchData, postData, updateData, deleteData } from "@/lib/fetch-util";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const useCreateWorkspace = () => {
  return useMutation({
    mutationFn: async (data: WorkspaceForm) => postData("/workspaces", data),
  });
};

export const useGetWorkspacesQuery = () => {
  return useQuery({
    queryKey: ["workspaces"],
    queryFn: async () => fetchData("/workspaces"),
  });
};

export const useGetWorkspaceQuery = (workspaceId: string) => {
  return useQuery({
    queryKey: ["workspace", workspaceId],
    queryFn: async () => fetchData(`/workspaces/${workspaceId}/projects`),
  });
};

export const useGetWorkspaceStatsQuery = (workspaceId: string, options?: { enabled?: boolean }) => {
  return useQuery({
    queryKey: ["workspace", workspaceId, "stats"],
    queryFn: async () => fetchData(`/workspaces/${workspaceId}/stats`),
    enabled: options?.enabled !== false && !!workspaceId, // Default enabled unless explicitly disabled
  });
};

export const useGetWorkspaceDetailsQuery = (workspaceId: string) => {
  return useQuery<Workspace>({
    queryKey: ["workspace", workspaceId, "details"],
    queryFn: async () => fetchData<Workspace>(`/workspaces/${workspaceId}`),
    enabled: !!workspaceId,
  });
};

export const useInviteMemberMutation = () => {
  return useMutation({
    mutationFn: (data: { email: string; role: string; workspaceId: string }) =>
      postData(`/workspaces/${data.workspaceId}/invite-member`, data),
  });
};

export const useAcceptInviteByTokenMutation = () => {
  return useMutation({
    mutationFn: (token: string) =>
      postData(`/workspaces/accept-invite-token`, {
        token,
      }),
  });
};

export const useAcceptGenerateInviteMutation = () => {
  return useMutation({
    mutationFn: (workspaceId: string) =>
      postData(`/workspaces/${workspaceId}/accept-generate-invite`, {}),
  });
};

export interface UpdateWorkspaceData {
  name?: string;
  description?: string;
  color?: string;
}

export const useUpdateWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, data }: { workspaceId: string; data: UpdateWorkspaceData }) =>
      updateData(`/workspaces/${workspaceId}`, data),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate related queries
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId] });
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
    },
  });
};

export const useDeleteWorkspaceMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: (workspaceId: string) => deleteData(`/workspaces/${workspaceId}`),
    onSuccess: (_, workspaceId) => {
      // Remove the workspace from cache and invalidate workspaces list
      queryClient.invalidateQueries({ queryKey: ["workspaces"] });
      queryClient.removeQueries({ queryKey: ["workspace", workspaceId] });
    },
  });
};

export const useUpdateMemberRoleMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, memberId, role }: { workspaceId: string; memberId: string; role: string }) =>
      updateData(`/workspaces/${workspaceId}/members/${memberId}/role`, { role }),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate workspace details to refresh member list
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "details"] });
    },
  });
};

export const useRemoveMemberMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ workspaceId, memberId }: { workspaceId: string; memberId: string }) =>
      deleteData(`/workspaces/${workspaceId}/members/${memberId}`),
    onSuccess: (_, { workspaceId }) => {
      // Invalidate workspace details to refresh member list
      queryClient.invalidateQueries({ queryKey: ["workspace", workspaceId, "details"] });
    },
  });
};
