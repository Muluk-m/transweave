"use client";
import { useMemo, useState, useEffect, useCallback } from "react";
import { Project, Token } from "@/jotai/types";
import {
  createToken,
  updateToken,
  deleteToken,
  restoreTokenVersion,
} from "@/api/project";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import { translateWithAi, getAiConfigStatus } from "@/api/ai";
import { isValidTokenKey } from "@/lib/validation";

export interface TokenFormData {
  key: string;
  module?: string;
  tags: string;
  comment: string;
  translations: Record<string, string>;
  screenshots?: string[];
}

export function useTokenFormState(
  project: Project | null,
  tokens: Token[],
  fetchTokens: () => Promise<void>,
  fetchTags: () => Promise<void>,
) {
  const t = useTranslations("projectTokens");
  const { toast } = useToast();

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
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [aiConfigured, setAiConfigured] = useState<boolean>(false);

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

  const handleRestoreVersion = async (historyId: string) => {
    if (!currentToken) return;
    await restoreTokenVersion(currentToken.id, historyId);
    await fetchTokens();
    toast({ title: t("versionRestored") });
    setIsDrawerOpen(false);
  };

  return {
    formData,
    isEditing,
    isLoading,
    isTranslating,
    currentToken,
    isDrawerOpen,
    setIsDrawerOpen,
    aiConfigured,
    checkKeyConflict,
    handleInputChange,
    handleTranslationChange,
    handleScreenshotsChange,
    handleModuleChange,
    handleSubmit,
    handleTranslate,
    handleEditToken,
    handleDeleteToken,
    handleOpenAddDrawer,
    handleRestoreVersion,
  };
}
