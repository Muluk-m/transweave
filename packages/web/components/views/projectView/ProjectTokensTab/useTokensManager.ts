"use client";
import { useState, useEffect, useCallback } from "react";
import { Project, Token } from "@/jotai/types";
import { searchTokens } from "@/api/project";
import { useTokenFilters } from "./useTokenFilters";
import { useTokenPagination } from "./useTokenPagination";
import { useTokenFormState } from "./useTokenFormState";
import { useBatchOperations } from "./useBatchOperations";

export type { TokenFormData } from "./useTokenFormState";

export function useTokensManager(project: Project | null) {
  const [tokens, setTokens] = useState<Token[]>([]);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  const filters = useTokenFilters(project?.id);
  const pagination = useTokenPagination();

  useEffect(() => {
    pagination.setPage(1);
  }, [filters.debouncedSearch, filters.selectedModule, filters.selectedStatus, filters.selectedTag, pagination.setPage]);

  const fetchTokens = useCallback(async () => {
    if (!project?.id) return;
    try {
      const sortField = pagination.sorting[0];
      const result = await searchTokens(project.id, {
        query: filters.debouncedSearch || undefined,
        module: filters.selectedModule || undefined,
        status: (filters.selectedStatus as "all" | "completed" | "incomplete") || "all",
        tags: filters.selectedTag || undefined,
        sortBy: sortField?.id || "createdAt",
        sortOrder: sortField?.desc ? "desc" : "asc",
        page: pagination.page,
        perPage: pagination.perPage,
      });
      setTokens(result.tokens);
      setTotalTokens(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Error fetching tokens:", error);
    }
  }, [
    project?.id,
    filters.debouncedSearch,
    filters.selectedModule,
    filters.selectedStatus,
    filters.selectedTag,
    pagination.sorting,
    pagination.page,
    pagination.perPage,
  ]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  const formState = useTokenFormState(project, tokens, fetchTokens, filters.fetchTags);
  const batch = useBatchOperations(project, fetchTokens, filters.fetchTags, formState.checkKeyConflict);

  return {
    // Filter state
    selectedTag: filters.selectedTag,
    selectedModule: filters.selectedModule,
    setSelectedModule: filters.setSelectedModule,
    selectedStatus: filters.selectedStatus,
    setSelectedStatus: filters.setSelectedStatus,
    searchTerm: filters.searchTerm,
    allTags: filters.allTags,

    // Data
    tokens,
    totalTokens,
    totalPages,

    // Form state
    formData: formState.formData,
    isEditing: formState.isEditing,
    isLoading: formState.isLoading,
    isTranslating: formState.isTranslating,
    currentToken: formState.currentToken,
    isDrawerOpen: formState.isDrawerOpen,
    setIsDrawerOpen: formState.setIsDrawerOpen,

    // Batch state
    isBatchDialogOpen: batch.isBatchDialogOpen,
    setIsBatchDialogOpen: batch.setIsBatchDialogOpen,
    isBatchLoading: batch.isBatchLoading,
    isBatchTranslating: batch.isBatchTranslating,
    translateProgress: batch.translateProgress,
    isBatchSettingModule: batch.isBatchSettingModule,
    batchModuleProgress: batch.batchModuleProgress,

    // AI
    aiConfigured: formState.aiConfigured,

    // Handlers
    handleInputChange: formState.handleInputChange,
    handleTranslationChange: formState.handleTranslationChange,
    handleScreenshotsChange: formState.handleScreenshotsChange,
    handleModuleChange: formState.handleModuleChange,
    handleSubmit: formState.handleSubmit,
    handleTranslate: formState.handleTranslate,
    handleEditToken: formState.handleEditToken,
    handleDeleteToken: formState.handleDeleteToken,
    handleDeleteSelected: batch.handleDeleteSelected,
    handleOpenAddDrawer: formState.handleOpenAddDrawer,
    handleTagChange: filters.handleTagChange,
    handleSearchChange: filters.handleSearchChange,
    handleBatchSubmit: batch.handleBatchSubmit,
    handleBatchTranslateSelected: batch.handleBatchTranslateSelected,
    handleBatchSetModule: batch.handleBatchSetModule,
    handleBatchSetTags: batch.handleBatchSetTags,
    handleRestoreVersion: formState.handleRestoreVersion,
  };
}
