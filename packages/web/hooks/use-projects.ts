'use client';

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getTeamProjects, createProject, updateProject, deleteProject } from '@/api/project';
import { Project } from '@/jotai/types';

export function useProjects(teamId?: string) {
  return useQuery<Project[]>({
    queryKey: ['projects', teamId],
    queryFn: () => getTeamProjects(teamId!),
    enabled: !!teamId,
  });
}

export function useCreateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      name: string;
      teamId: string;
      description?: string;
      languages?: string[];
    }) => createProject(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useUpdateProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string;
      data: {
        name?: string;
        description?: string;
        languages?: string[];
        languageLabels?: Record<string, string>;
        modules?: Array<{ code: string; description?: string }>;
        url?: string;
        enableVersioning?: boolean;
      };
    }) => updateProject(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}

export function useDeleteProject() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => deleteProject(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['projects'] });
    },
  });
}
