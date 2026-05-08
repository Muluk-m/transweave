"use client";
import { useState, useEffect, useRef } from "react";
import { Project, Token, type TranslationStatus } from "@/jotai/types";
import {
  createToken,
  updateToken,
  bulkTokenOperation,
} from "@/api/project";
import { useToast } from "@/components/ui/use-toast";
import { useTranslations } from "next-intl";
import { batchTranslateWithAi } from "@/api/ai";
import { isValidTokenKey } from "@/lib/validation";
import type { BatchTokenInput } from "./BatchAddDialog";

export function useBatchOperations(
  project: Project | null,
  fetchTokens: () => Promise<void>,
  fetchTags: () => Promise<void>,
  checkKeyConflict: (
    newKey: string,
    editTokenId?: string | null
  ) => { conflict: boolean; conflictKey?: string; type?: "prefix" | "parent" },
) {
  const t = useTranslations("projectTokens");
  const { toast } = useToast();
  const batchTranslateAbortRef = useRef<AbortController | null>(null);

  useEffect(() => {
    return () => {
      batchTranslateAbortRef.current?.abort();
    };
  }, []);

  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState<boolean>(false);
  const [isBatchLoading, setIsBatchLoading] = useState<boolean>(false);
  const [isBatchTranslating, setIsBatchTranslating] = useState<boolean>(false);
  const [translateProgress, setTranslateProgress] = useState<number>(0);
  const [isBatchSettingModule, setIsBatchSettingModule] = useState<boolean>(false);
  const [batchModuleProgress, setBatchModuleProgress] = useState<number>(0);
  const [isBatchSettingStatus, setIsBatchSettingStatus] = useState<boolean>(false);

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

  const handleBatchSetStatus = async (
    selectedTokens: Token[],
    languages: string[],
    status: TranslationStatus,
  ) => {
    if (!project?.id) return;
    if (selectedTokens.length === 0 || languages.length === 0) return;
    try {
      setIsBatchSettingStatus(true);
      const tokenIds = selectedTokens.map((tk) => tk.id);
      await bulkTokenOperation(tokenIds, "set-status", { languages, status });
      await fetchTokens();
      toast({ title: t("batchStatusSuccess", { count: tokenIds.length }) });
    } catch (error) {
      console.error("Batch set status error:", error);
      toast({ title: t("batchStatusFailed"), variant: "destructive" });
    } finally {
      setIsBatchSettingStatus(false);
    }
  };

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

  const handleBatchTranslateSelected = async (selectedTokens: Token[]) => {
    if (!project?.languages || project.languages.length === 0) {
      toast({ title: t("errors.noLanguageToTranslate"), variant: "destructive" });
      return;
    }
    if (selectedTokens.length === 0) return;

    try {
      setIsBatchTranslating(true);
      setTranslateProgress(0);

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

      const tokenMap = new Map(selectedTokens.map((t) => [t.id, t]));

      batchTranslateAbortRef.current?.abort();
      const controller = new AbortController();
      batchTranslateAbortRef.current = controller;

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
      }, controller.signal);

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

  return {
    isBatchDialogOpen,
    setIsBatchDialogOpen,
    isBatchLoading,
    isBatchTranslating,
    translateProgress,
    isBatchSettingModule,
    batchModuleProgress,
    isBatchSettingStatus,
    handleDeleteSelected,
    handleBatchSetModule,
    handleBatchSetStatus,
    handleBatchSetTags,
    handleBatchSubmit,
    handleBatchTranslateSelected,
  };
}
