import type { CreateProjectFormData } from "@/components/project/create-project";
import { fetchData, postData, updateData, deleteData } from "@/lib/fetch-util";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";

export const UseCreateProject = () => {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (data: {
      projectData: CreateProjectFormData;
      workspaceId: string;
    }) =>
      postData(
        `/projects/${data.workspaceId}/create-project`,
        data.projectData
      ),
    onSuccess: (data: any) => {
      queryClient.invalidateQueries({
        queryKey: ["workspace", data.workspace],
      });
    },
  });
};

export const UseProjectQuery = (projectId: string) => {
  return useQuery({
    queryKey: ["project", projectId, "with-archived"],
    queryFn: () => fetchData(`/projects/${projectId}/tasks?includeArchived=true`),
  });
};

export const useAddProjectMemberMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, userId, role }: { projectId: string; userId: string; role: string }) =>
      postData(`/projects/${projectId}/members`, { userId, role }),
    onSuccess: (_, { projectId }) => {
      // Invalidate project details to refresh member list
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
};

export const useRemoveProjectMemberMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, userId }: { projectId: string; userId: string }) =>
      deleteData(`/projects/${projectId}/members/${userId}`),
    onSuccess: (_, { projectId }) => {
      // Invalidate project details to refresh member list
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
};

export const useUpdateProjectMemberRoleMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ projectId, userId, role }: { projectId: string; userId: string; role: string }) =>
      updateData(`/projects/${projectId}/members/${userId}/role`, { role }),
    onSuccess: (_, { projectId }) => {
      // Invalidate project details to refresh member list
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
};

export const useUpdateProjectMutation = () => {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: ({ 
      projectId, 
      data 
    }: { 
      projectId: string; 
      data: {
        title?: string;
        description?: string;
        status?: "Planning" | "In Progress" | "On Hold" | "Completed" | "Cancelled";
        startDate?: Date;
        dueDate?: Date;
      } 
    }) =>
      updateData(`/projects/${projectId}`, data),
    onSuccess: (_, { projectId }) => {
      // Invalidate project details to refresh updated data
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
    },
  });
};
