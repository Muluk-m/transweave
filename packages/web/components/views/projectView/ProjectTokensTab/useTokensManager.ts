"use client";
import { useMemo, useState, useEffect, useRef, useCallback } from "react";
import { Project, Token } from "@/jotai/types";
import {
  searchTokens,
  createToken,
  updateToken,
  deleteToken,
  bulkTokenOperation,
  getProjectTags,
  restoreTokenVersion,
} from "@/api/project";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import { translateWithAi, batchTranslateWithAi, getAiConfigStatus } from "@/api/ai";
import { useQueryState } from "nuqs";
import { parseAsInteger } from "nuqs";
import { getSortingStateParser } from "@/lib/parsers";
import { isValidTokenKey } from "@/lib/validation";
import type { BatchTokenInput } from "./BatchAddDialog";

export interface TokenFormData {
  key: string;
  module?: string;
  tags: string;
  comment: string;
  translations: Record<string, string>;
  screenshots?: string[];
}

export function useTokensManager(project: Project | null) {
  const t = useTranslations("projectTokens");
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Filter state
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");

  // Data state
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const [totalTokens, setTotalTokens] = useState<number>(0);
  const [totalPages, setTotalPages] = useState<number>(0);

  // Pagination (URL query state, shared with useDataTable in TokenTable)
  const [page, setPage] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));
  const [sorting] = useQueryState(
    "sort",
    getSortingStateParser<Token>().withDefault([
      { id: "createdAt", desc: true },
    ])
  );

  // Form state
  const [formData, setFormData] = useState<TokenFormData>({
    key: "",
    module: "",
    tags: "",
    comment: "",
    translations: {},
    screenshots: [],
  });
  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [currentTokenId, setCurrentTokenId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

  // Batch state
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState<boolean>(false);
  const [isBatchLoading, setIsBatchLoading] = useState<boolean>(false);
  const [isBatchTranslating, setIsBatchTranslating] = useState<boolean>(false);
  const [translateProgress, setTranslateProgress] = useState<number>(0);
  const [isBatchSettingModule, setIsBatchSettingModule] = useState<boolean>(false);
  const [batchModuleProgress, setBatchModuleProgress] = useState<number>(0);

  // AI configuration status
  const [aiConfigured, setAiConfigured] = useState<boolean>(false);

  // All tags fetched from backend
  const [allTags, setAllTags] = useState<string[]>([]);

  // Debounced search
  const [debouncedSearch, setDebouncedSearch] = useState<string>("");

  useEffect(() => {
    if (project?.id) {
      getAiConfigStatus(project.id)
        .then((status) => {
          setAiConfigured(status.configured);
        })
        .catch(() => {
          setAiConfigured(false);
        });
    }
  }, [project?.id]);

  const fetchTags = useCallback(async () => {
    if (!project?.id) return;
    try {
      const tags = await getProjectTags(project.id);
      setAllTags(tags);
    } catch {
      // Silently fail
    }
  }, [project?.id]);

  useEffect(() => {
    fetchTags();
  }, [fetchTags]);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(searchTerm);
    }, 300);
    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [searchTerm]);

  // Reset page to 1 when filters change
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, selectedModule, selectedStatus, selectedTag, setPage]);

  // Fetch tokens from server
  const fetchTokens = useCallback(async () => {
    if (!project?.id) return;
    try {
      const sortField = sorting[0];
      const result = await searchTokens(project.id, {
        query: debouncedSearch || undefined,
        module: selectedModule || undefined,
        status: (selectedStatus as "all" | "completed" | "incomplete") || "all",
        tags: selectedTag || undefined,
        sortBy: sortField?.id || "createdAt",
        sortOrder: sortField?.desc ? "desc" : "asc",
        page,
        perPage,
      });
      setTokens(result.tokens);
      setTotalTokens(result.total);
      setTotalPages(result.totalPages);
    } catch (error) {
      console.error("Error fetching tokens:", error);
    }
  }, [
    project?.id,
    debouncedSearch,
    selectedModule,
    selectedStatus,
    selectedTag,
    sorting,
    page,
    perPage,
  ]);

  useEffect(() => {
    fetchTokens();
  }, [fetchTokens]);

  // Initialize translation fields
  useEffect(() => {
    if (project?.languages) {
      const initialTranslations: Record<string, string> = {};
      project.languages.forEach((lang) => {
        initialTranslations[lang] = "";
      });
      setFormData((prev) => ({
        ...prev,
        translations: initialTranslations,
      }));
    }
  }, [project?.languages]);

  // Key conflict check
  const checkKeyConflict = (
    newKey: string,
    editTokenId?: string | null
  ): { conflict: boolean; conflictKey?: string; type?: "prefix" | "parent" } => {
    const keysToCheck = tokens
      .filter((token) => token.id !== editTokenId)
      .map((token) => token.key);

    for (const existingKey of keysToCheck) {
      if (newKey.startsWith(existingKey + ".")) {
        return { conflict: true, conflictKey: existingKey, type: "parent" };
      }
    }
    for (const existingKey of keysToCheck) {
      if (existingKey.startsWith(newKey + ".")) {
        return { conflict: true, conflictKey: existingKey, type: "prefix" };
      }
    }
    if (keysToCheck.includes(newKey)) {
      return { conflict: true, conflictKey: newKey, type: "prefix" };
    }
    return { conflict: false };
  };

  // Form input handlers
  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleTranslationChange = (lang: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      translations: { ...prev.translations, [lang]: value },
    }));
  };

  const handleScreenshotsChange = (screenshots: string[]) => {
    setFormData((prev) => ({ ...prev, screenshots }));
  };

  const handleModuleChange = (module: string) => {
    setFormData((prev) => ({ ...prev, module }));
  };

  // Reset form
  const resetForm = () => {
    const initialTranslations: Record<string, string> = {};
    if (project?.languages) {
      project.languages.forEach((lang) => {
        initialTranslations[lang] = "";
      });
    }
    setFormData({
      key: "",
      tags: "",
      comment: "",
      translations: initialTranslations,
    });
    setIsEditing(false);
    setCurrentTokenId(null);
  };

  const handleOpenAddDrawer = () => {
    resetForm();
    setIsDrawerOpen(true);
  };

  // Edit token
  const handleEditToken = (token: Token) => {
    setIsEditing(true);
    setCurrentTokenId(token.id);
    const translations: Record<string, string> = {};
    if (project?.languages) {
      project.languages.forEach((lang) => {
        translations[lang] = token.translations?.[lang] || "";
      });
    }
    setFormData({
      key: token.key,
      module: token.module || "",
      tags: token.tags.join(", "),
      comment: token.comment || "",
      translations,
      screenshots: token.screenshots || [],
    });
    setIsDrawerOpen(true);
  };

  // Delete token
  const handleDeleteToken = async (tokenId: string) => {
    try {
      await deleteToken(tokenId);
      await fetchTokens();
      await fetchTags();
      toast({ title: t("success.tokenDeleted") });
    } catch (error) {
      toast({ title: t("errors.deleteFailed"), variant: "destructive" });
    }
  };

  // Submit form
  const currentToken = useMemo(() => {
    return tokens.find((token) => token.id === currentTokenId);
  }, [tokens, currentTokenId]);

  const handleSubmit = async () => {
    const isEditingLegacyKey =
      isEditing && currentToken && formData.key === currentToken.key;

    if (!isEditingLegacyKey && !isValidTokenKey(formData.key)) {
      toast({ title: t("errors.invalidKey"), variant: "destructive", duration: 2000 });
      return;
    }

    const conflictCheck = checkKeyConflict(formData.key, currentTokenId);
    if (conflictCheck.conflict) {
      const errorMsg =
        conflictCheck.type === "parent"
          ? t("errors.keyConflictParent", { key: formData.key, conflictKey: conflictCheck.conflictKey })
          : t("errors.keyConflictChild", { key: formData.key, conflictKey: conflictCheck.conflictKey });
      toast({ title: errorMsg, variant: "destructive", duration: 3000 });
      return;
    }

    try {
      setIsLoading(true);
      if (!project?.id) {
        toast({ title: t("errors.projectIdMissing"), variant: "destructive" });
        return;
      }

      const tagArray = formData.tags
        ? formData.tags.split(",").map((tag) => tag.trim())
        : [];

      if (isEditing && currentTokenId) {
        await updateToken(currentTokenId, {
          key: formData.key,
          module: formData.module,
          tags: tagArray,
          comment: formData.comment,
          translations: formData.translations,
          screenshots: formData.screenshots,
        });
        await fetchTokens();
        await fetchTags();
        toast({ title: t("success.tokenUpdated") });
      } else {
        await createToken(project.id, {
          key: formData.key,
          module: formData.module,
          tags: tagArray,
          comment: formData.comment,
          translations: formData.translations,
          screenshots: formData.screenshots,
        });
        await fetchTokens();
        await fetchTags();
        toast({ title: t("success.tokenCreated") });
      }

      resetForm();
      setIsDrawerOpen(false);
    } catch (error) {
      console.error("Error submitting form:", error);
      toast({
        title: isEditing ? t("errors.updateFailed") : t("errors.createFailed"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Translate
  const handleTranslate = async () => {
    setIsTranslating(true);
    let from = "";
    const to: string[] = [];

    for (const [key, value] of Object.entries(formData.translations)) {
      if (!value) {
        to.push(key);
      } else {
        if (!from) from = key;
      }
    }

    if (!from || !to.length) {
      toast({ title: t("errors.noLanguageToTranslate"), variant: "destructive", duration: 2000 });
      setIsTranslating(false);
      return;
    }

    const result = await translateWithAi(
      formData.translations[from],
      from,
      to,
      project?.id || ""
    ).catch((error) => {
      console.error("Error translating:", error);
      toast({ title: t("errors.translateFailed"), variant: "destructive", duration: 2000 });
    });

    setIsTranslating(false);

    if (result) {
      setFormData((prev) => ({
        ...prev,
        translations: { ...prev.translations, ...result.translations },
      }));
    }
  };

  // Delete selected
  const handleDeleteSelected = async (selected: string[]) => {
    try {
      await bulkTokenOperation(selected, "delete");
      await fetchTokens();
      await fetchTags();
      toast({ title: t("success.tokensDeleted") });
    } catch (error) {
      toast({ title: t("errors.deleteFailed"), variant: "destructive" });
    }
  };

  // Batch set module
  const handleBatchSetModule = async (selectedTokens: Token[], moduleCode: string | null) => {
    if (!project?.id) return;
    try {
      setIsBatchSettingModule(true);
      setBatchModuleProgress(30);
      const tokenIds = selectedTokens.map((t) => t.id);
      await bulkTokenOperation(tokenIds, "set-module", { module: moduleCode });
      setBatchModuleProgress(80);
      await fetchTokens();
      setBatchModuleProgress(100);
      toast({ title: t("batchModuleSuccess") });
    } catch (error) {
      console.error("Batch set module error:", error);
      toast({ title: t("batchModuleFailed"), variant: "destructive" });
    } finally {
      setIsBatchSettingModule(false);
      setBatchModuleProgress(0);
    }
  };

  // Batch set tags
  const handleBatchSetTags = async (selectedTokens: Token[], tags: string[]) => {
    if (!project?.id) return;
    try {
      const tokenIds = selectedTokens.map((t) => t.id);
      await bulkTokenOperation(tokenIds, "set-tags", { tags });
      await fetchTokens();
      await fetchTags();
      toast({ title: t("batchTagsSuccess") });
    } catch (error) {
      console.error("Batch set tags error:", error);
      toast({ title: t("batchTagsFailed"), variant: "destructive" });
    }
  };

  // Batch submit
  const handleBatchSubmit = async (batchTokens: BatchTokenInput[]) => {
    if (!project?.id) {
      toast({ title: t("errors.projectIdMissing"), variant: "destructive" });
      return;
    }

    for (const tokenInput of batchTokens) {
      if (!isValidTokenKey(tokenInput.key)) {
        toast({ title: t("errors.keyFormatInvalid", { key: tokenInput.key }), variant: "destructive", duration: 3000 });
        return;
      }
      const conflictCheck = checkKeyConflict(tokenInput.key, null);
      if (conflictCheck.conflict) {
        const errorMsg =
          conflictCheck.type === "parent"
            ? t("errors.keyConflictParent", { key: tokenInput.key, conflictKey: conflictCheck.conflictKey })
            : t("errors.keyConflictChild", { key: tokenInput.key, conflictKey: conflictCheck.conflictKey });
        toast({ title: errorMsg, variant: "destructive", duration: 3000 });
        return;
      }
    }

    for (let i = 0; i < batchTokens.length; i++) {
      for (let j = i + 1; j < batchTokens.length; j++) {
        const key1 = batchTokens[i].key;
        const key2 = batchTokens[j].key;
        if (key1 === key2) {
          toast({ title: t("errors.batchDuplicateKey", { key: key1 }), variant: "destructive", duration: 3000 });
          return;
        }
        if (key2.startsWith(key1 + ".")) {
          toast({ title: t("errors.batchKeyConflict", { key1, key2 }), variant: "destructive", duration: 3000 });
          return;
        }
        if (key1.startsWith(key2 + ".")) {
          toast({ title: t("errors.batchKeyConflict", { key1: key2, key2: key1 }), variant: "destructive", duration: 3000 });
          return;
        }
      }
    }

    try {
      setIsBatchLoading(true);
      const createdTokens = await Promise.all(
        batchTokens.map((tokenInput) =>
          createToken(project.id, {
            key: tokenInput.key,
            tags: tokenInput.tags,
            comment: tokenInput.comment,
            translations: tokenInput.translations || {},
          })
        )
      );
      await fetchTokens();
      await fetchTags();
      toast({ title: t("success.batchTokensCreated", { count: createdTokens.length }) });
      setIsBatchDialogOpen(false);
    } catch (error) {
      console.error("Error batch creating tokens:", error);
      toast({ title: t("errors.batchCreateFailed"), variant: "destructive" });
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Batch translate via SSE
  const handleBatchTranslateSelected = async (selectedTokens: Token[]) => {
    if (!project?.languages || project.languages.length === 0) {
      toast({ title: t("errors.noLanguageToTranslate"), variant: "destructive" });
      return;
    }
    if (selectedTokens.length === 0) return;

    try {
      setIsBatchTranslating(true);
      setTranslateProgress(0);

      // Build batch request — filter out tokens with no translatable content
      const batchTokens = selectedTokens
        .map((token) => {
          const filledLangs = project.languages.filter(
            (lang) => token.translations?.[lang]?.trim()
          );
          const emptyLangs = project.languages.filter(
            (lang) => !token.translations?.[lang]?.trim()
          );
          if (filledLangs.length === 0 || emptyLangs.length === 0) return null;
          const sourceLang = filledLangs[0];
          return {
            id: token.id,
            text: token.translations![sourceLang],
            from: sourceLang,
            to: emptyLangs,
          };
        })
        .filter(Boolean) as Array<{ id: string; text: string; from: string; to: string[] }>;

      if (batchTokens.length === 0) {
        toast({ title: t("errors.noLanguageToTranslate"), variant: "destructive" });
        setIsBatchTranslating(false);
        return;
      }

      // Map token IDs to their current translations for merging
      const tokenMap = new Map(selectedTokens.map((t) => [t.id, t]));

      await batchTranslateWithAi(batchTokens, project.id, async (event) => {
        if (event.type === 'result' && event.tokenId && event.translations) {
          const token = tokenMap.get(event.tokenId);
          if (token) {
            const updatedTranslations = { ...token.translations, ...event.translations };
            await updateToken(event.tokenId, { translations: updatedTranslations });
          }
        }
        if (event.completed != null && event.total != null) {
          setTranslateProgress(Math.round((event.completed / event.total) * 100));
        }
      });

      await fetchTokens();
      toast({ title: t("success.batchTranslated") });
    } catch (error) {
      console.error("Batch translate error:", error);
      toast({ title: t("errors.translateFailed"), variant: "destructive" });
    } finally {
      setIsBatchTranslating(false);
      setTimeout(() => setTranslateProgress(0), 1000);
    }
  };

  // Restore version
  const handleRestoreVersion = async (historyId: string) => {
    if (!currentToken) return;
    await restoreTokenVersion(currentToken.id, historyId);
    await fetchTokens();
    toast({ title: t("versionRestored") });
    setIsDrawerOpen(false);
  };

  const handleTagChange = (tag: string) => {
    setSelectedTag(tag === "all" ? null : tag);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  return {
    // Filter state
    selectedTag,
    selectedModule,
    setSelectedModule,
    selectedStatus,
    setSelectedStatus,
    searchTerm,
    allTags,

    // Data
    tokens,
    totalTokens,
    totalPages,

    // Form state
    formData,
    isEditing,
    isLoading,
    isTranslating,
    currentToken,
    isDrawerOpen,
    setIsDrawerOpen,

    // Batch state
    isBatchDialogOpen,
    setIsBatchDialogOpen,
    isBatchLoading,
    isBatchTranslating,
    translateProgress,
    isBatchSettingModule,
    batchModuleProgress,

    // AI
    aiConfigured,

    // Handlers
    handleInputChange,
    handleTranslationChange,
    handleScreenshotsChange,
    handleModuleChange,
    handleSubmit,
    handleTranslate,
    handleEditToken,
    handleDeleteToken,
    handleDeleteSelected,
    handleOpenAddDrawer,
    handleTagChange,
    handleSearchChange,
    handleBatchSubmit,
    handleBatchTranslateSelected,
    handleBatchSetModule,
    handleBatchSetTags,
    handleRestoreVersion,
  };
}
