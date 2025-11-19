"use client";
import { useMemo, useState, useEffect } from "react";
import { Project, Token } from "@/jotai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  createToken,
  updateToken,
  deleteToken,
  batchUpdateTokenModule,
} from "@/api/project";
import { useToast } from "@/components/ui/use-toast";
import { TokenFormDrawer } from "./TokenFormDrawer";
import { TokenTable } from "./TokenTable";
import { BatchAddDialog, BatchTokenInput } from "./BatchAddDialog";
import { Plus, FileText } from "lucide-react";
import { useTranslations } from "next-intl";
import { translateWithAi } from "@/api/ai";
import { useQueryState } from "nuqs";
import { getSortingStateParser } from "@/lib/parsers";
import { Progress } from "@/components/ui/progress";

interface ProjectTokensTabProps {
  project: Project | null;
}

export function ProjectTokensTab({ project }: ProjectTokensTabProps) {
  const t = useTranslations("projectTokens");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [selectedModule, setSelectedModule] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const { toast } = useToast();

  const [sorting] = useQueryState(
    "sort",
    getSortingStateParser<Token>().withDefault([
      { id: "createdAt", desc: true },
    ])
  );

  const [formData, setFormData] = useState<{
    key: string;
    module?: string;
    tags: string;
    comment: string;
    translations: Record<string, string>;
    screenshots?: string[];
  }>({
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
  const [isBatchDialogOpen, setIsBatchDialogOpen] = useState<boolean>(false);
  const [isBatchLoading, setIsBatchLoading] = useState<boolean>(false);
  const [isBatchTranslating, setIsBatchTranslating] = useState<boolean>(false);
  const [translateProgress, setTranslateProgress] = useState<number>(0);
  const [isBatchSettingModule, setIsBatchSettingModule] = useState<boolean>(false);
  const [batchModuleProgress, setBatchModuleProgress] = useState<number>(0);

  // Initialize tokens data
  useEffect(() => {
    if (project?.tokens) {
      setTokens(project.tokens);
    }
  }, [project]);

  // Initialize translation fields in form data
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

  const allTags = useMemo(() => {
    let tags: string[] = [];
    tokens?.forEach((token) => {
      tags = [...tags, ...token.tags];
    });
    return Array.from(new Set(tags));
  }, [tokens]);

  const filteredAndSortedTokens = useMemo(() => {
    let result = [...tokens];

    // Filter by module
    if (selectedModule) {
      if (selectedModule === "__no_module__") {
        // 筛选无模块的词条
        result = result.filter((token) => !token.module);
      } else {
        // 筛选指定模块的词条
        result = result.filter((token) => token.module === selectedModule);
      }
    }

    // Filter by tag
    if (selectedTag) {
      result = result.filter((token) => token.tags.includes(selectedTag));
    }

    // Filter by search term
    if (searchTerm) {
      result = result.filter(
        (token) =>
          token.key.toLowerCase().includes(searchTerm.toLowerCase()) ||
          Object.values(token.translations || {}).some((t) =>
            t.toLowerCase().includes(searchTerm.toLowerCase())
          )
      );
    }

    // Sort
    if (sorting.length > 0) {
      const sort = sorting[0];
      if (sort) {
        result.sort((a, b) => {
          let aValue: any;
          let bValue: any;
          if (
            sort.id === "key" ||
            sort.id === "tags" ||
            sort.id === "createdAt"
          ) {
            aValue = a[sort.id];
            bValue = b[sort.id];
          } else {
            aValue = a.translations?.[sort.id] || "";
            bValue = b.translations?.[sort.id] || "";
          }

          if (aValue < bValue) {
            return sort.desc ? 1 : -1;
          }
          if (aValue > bValue) {
            return sort.desc ? -1 : 1;
          }
          return 0;
        });
      }
    }

    return result;
  }, [tokens, selectedModule, selectedTag, searchTerm, sorting]);

  const isValidKey = (key: string) => {
    return /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/.test(key);
  };

  // Check if a new key conflicts with existing keys
  // Conflict occurs when:
  // 1. New key is a prefix of an existing key (e.g., adding "alert" when "alert.message" exists)
  // 2. An existing key is a prefix of the new key (e.g., adding "alert.message" when "alert" exists)
  const checkKeyConflict = (
    newKey: string,
    currentTokenId?: string | null
  ): { conflict: boolean; conflictKey?: string; type?: "prefix" | "parent" } => {
    // Get all existing keys except the current token being edited
    const keysToCheck = tokens
      .filter((token) => token.id !== currentTokenId)
      .map((token) => token.key);

    // Check if any existing key is a prefix of the new key
    // e.g., existing "alert" conflicts with new "alert.message"
    for (const existingKey of keysToCheck) {
      if (newKey.startsWith(existingKey + ".")) {
        return { conflict: true, conflictKey: existingKey, type: "parent" };
      }
    }

    // Check if the new key is a prefix of any existing key
    // e.g., new "alert" conflicts with existing "alert.message"
    for (const existingKey of keysToCheck) {
      if (existingKey.startsWith(newKey + ".")) {
        return { conflict: true, conflictKey: existingKey, type: "prefix" };
      }
    }

    // Check for exact duplicate
    if (keysToCheck.includes(newKey)) {
      return { conflict: true, conflictKey: newKey, type: "prefix" };
    }

    return { conflict: false };
  };

  // Form input handlers
  const handleInputChange = (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // Translation field handlers
  const handleTranslationChange = (lang: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      translations: {
        ...prev.translations,
        [lang]: value,
      },
    }));
  };

  // Screenshots field handler
  const handleScreenshotsChange = (screenshots: string[]) => {
    setFormData((prev) => ({
      ...prev,
      screenshots,
    }));
  };

  // Module field handler
  const handleModuleChange = (module: string) => {
    setFormData((prev) => ({
      ...prev,
      module,
    }));
  };

  // 批量设置模块
  const handleBatchSetModule = async (selectedTokens: Token[], moduleCode: string | null) => {
    if (!project?.id) return;

    try {
      setIsBatchSettingModule(true);
      setBatchModuleProgress(30);

      const tokenIds = selectedTokens.map((t) => t.id);
      const updatedTokens = await batchUpdateTokenModule(tokenIds, moduleCode);

      // 更新本地 tokens 列表
      setTokens((prev) =>
        prev.map((t) => updatedTokens.find((u) => u.id === t.id) ?? t),
      );

      setBatchModuleProgress(100);

      toast({
        title: "批量更新模块成功",
      });
    } catch (error) {
      console.error("Batch set module error:", error);
      toast({
        title: "批量更新模块失败",
        variant: "destructive",
      });
    } finally {
      setIsBatchSettingModule(false);
      setBatchModuleProgress(0);
    }
  };

  // Get translation text for a specific language
  const getTranslationText = (token: Token, lang: string): string => {
    if (!token.translations) return "";
    return token.translations[lang] || "";
  };

  // Submit form
  const handleSubmit = async () => {
    // Validate key format
    if (!isValidKey(formData.key)) {
      toast({
        title: t("errors.invalidKey"),
        variant: "destructive",
        duration: 2000,
      });
      return;
    }

    // Check for key conflicts
    const conflictCheck = checkKeyConflict(formData.key, currentTokenId);
    if (conflictCheck.conflict) {
      const errorMsg =
        conflictCheck.type === "parent"
          ? `无法添加 key "${formData.key}"，因为已存在父级 key "${conflictCheck.conflictKey}"`
          : `无法添加 key "${formData.key}"，因为已存在子级 key "${conflictCheck.conflictKey}"`;
      toast({
        title: errorMsg,
        variant: "destructive",
        duration: 3000,
      });
      return;
    }

    try {
      setIsLoading(true);

      if (!project?.id) {
        toast({
          title: t("errors.projectIdMissing"),
          variant: "destructive",
        });
        return;
      }

      // Process tags, split string into array
      const tagArray = formData.tags
        ? formData.tags.split(",").map((tag) => tag.trim())
        : [];

      if (isEditing && currentTokenId) {
        // Update token and its translations
        const updatedToken = await updateToken(currentTokenId, {
          key: formData.key,
          module: formData.module,
          tags: tagArray,
          comment: formData.comment,
          translations: formData.translations, // Pass translations object directly
          screenshots: formData.screenshots, // Include screenshots
        });

        // Update local state
        setTokens((prev) =>
          prev.map((token) =>
            token.id === currentTokenId ? { ...token, ...updatedToken } : token
          )
        );

        toast({
          title: t("success.tokenUpdated"),
        });
      } else {
        // Create new token with translations
        const newToken = await createToken(project.id, {
          key: formData.key,
          module: formData.module,
          tags: tagArray,
          comment: formData.comment,
          translations: formData.translations, // Pass translations object directly
          screenshots: formData.screenshots, // Include screenshots
        });

        setTokens((prev) => [...prev, newToken]);
        toast({
          title: t("success.tokenCreated"),
        });
      }

      // Reset form
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
        if (!from) {
          from = key;
        }
      }
    }

    if (!from || !to.length) {
      toast({
        title: t("errors.noLanguageToTranslate"),
        variant: "destructive",
        duration: 2000,
      });
      setIsTranslating(false);
      return;
    }
    const result = await translateWithAi(
      formData.translations[from],
      from,
      to
    ).catch((error) => {
      console.error("Error translating:", error);
      toast({
        title: t("errors.translateFailed"),
        variant: "destructive",
        duration: 2000,
      });
    });

    setIsTranslating(false);

    if (result) {
      setFormData((prev) => ({
        ...prev,
        translations: {
          ...prev.translations,
          ...result,
        },
      }));
    }
  };

  // Edit token
  const handleEditToken = (token: Token) => {
    setIsEditing(true);
    setCurrentTokenId(token.id);

    // Initialize translations object
    const translations: Record<string, string> = {};

    // For each language supported by the project, set an empty string or existing translation
    if (project?.languages) {
      project.languages.forEach((lang) => {
        // Get translation for each language from token.translations JSON
        translations[lang] = getTranslationText(token, lang);
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
      setTokens((prev) => prev.filter((token) => token.id !== tokenId));
      toast({
        title: t("success.tokenDeleted"),
      });
    } catch (error) {
      toast({
        title: t("errors.deleteFailed"),
        variant: "destructive",
      });
    }
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

  // Reset form when opening add drawer
  const handleOpenAddDrawer = () => {
    resetForm();
    setIsDrawerOpen(true);
  };

  const handleTagChange = (tag: string) => {
    setSelectedTag(tag === "all" ? null : tag);
  };

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
  };

  const handleDeleteSelected = async (selected: string[]) => {
    try {
      await Promise.all(selected.map((id) => deleteToken(id)));
      setTokens((prev) => prev.filter((token) => !selected.includes(token.id)));
      toast({
        title: t("success.tokensDeleted"),
      });
    } catch (error) {
      toast({
        title: t("errors.deleteFailed"),
        variant: "destructive",
      });
    }
  };

  const currentToken = useMemo(() => {
    return filteredAndSortedTokens.find((token) => token.id === currentTokenId);
  }, [filteredAndSortedTokens, currentTokenId]);

  // Handle batch create
  const handleBatchSubmit = async (batchTokens: BatchTokenInput[]) => {
    if (!project?.id) {
      toast({
        title: t("errors.projectIdMissing"),
        variant: "destructive",
      });
      return;
    }

    // Validate all keys before creating
    for (const tokenInput of batchTokens) {
      // Check key format
      if (!isValidKey(tokenInput.key)) {
        toast({
          title: `Key "${tokenInput.key}" 格式无效`,
          variant: "destructive",
          duration: 3000,
        });
        return;
      }

      // Check for conflicts with existing keys
      const conflictCheck = checkKeyConflict(tokenInput.key, null);
      if (conflictCheck.conflict) {
        const errorMsg =
          conflictCheck.type === "parent"
            ? `无法添加 key "${tokenInput.key}"，因为已存在父级 key "${conflictCheck.conflictKey}"`
            : `无法添加 key "${tokenInput.key}"，因为已存在子级 key "${conflictCheck.conflictKey}"`;
        toast({
          title: errorMsg,
          variant: "destructive",
          duration: 3000,
        });
        return;
      }
    }

    // Check for conflicts within the batch itself
    for (let i = 0; i < batchTokens.length; i++) {
      for (let j = i + 1; j < batchTokens.length; j++) {
        const key1 = batchTokens[i].key;
        const key2 = batchTokens[j].key;

        if (key1 === key2) {
          toast({
            title: `批量添加中存在重复的 key: "${key1}"`,
            variant: "destructive",
            duration: 3000,
          });
          return;
        }

        if (key2.startsWith(key1 + ".")) {
          toast({
            title: `批量添加中 key 冲突: "${key1}" 与 "${key2}"`,
            variant: "destructive",
            duration: 3000,
          });
          return;
        }

        if (key1.startsWith(key2 + ".")) {
          toast({
            title: `批量添加中 key 冲突: "${key2}" 与 "${key1}"`,
            variant: "destructive",
            duration: 3000,
          });
          return;
        }
      }
    }

    try {
      setIsBatchLoading(true);

      // Create all tokens
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

      // Update local state
      setTokens((prev) => [...prev, ...createdTokens]);

      toast({
        title: t("success.batchTokensCreated", { count: createdTokens.length }),
      });

      setIsBatchDialogOpen(false);
    } catch (error) {
      console.error("Error batch creating tokens:", error);
      toast({
        title: t("errors.batchCreateFailed"),
        variant: "destructive",
      });
    } finally {
      setIsBatchLoading(false);
    }
  };

  // Handle batch translate for selected tokens
  const handleBatchTranslateSelected = async (selectedTokens: Token[]) => {
    if (!project?.languages || project.languages.length === 0) {
      toast({
        title: t("errors.noLanguageToTranslate"),
        variant: "destructive",
      });
      return;
    }

    if (selectedTokens.length === 0) return;

    try {
      setIsBatchTranslating(true);
      setTranslateProgress(0);

      const total = selectedTokens.length;
      let completed = 0;

      // For each token, translate its first non-empty language to all empty languages
      for (const token of selectedTokens) {
        // Find which languages already have content
        const filledLangs = project.languages.filter(
          (lang) => token.translations?.[lang]?.trim()
        );

        // Find which languages need translation
        const emptyLangs = project.languages.filter(
          (lang) => !token.translations?.[lang]?.trim()
        );

        // Skip if no source or no target
        if (filledLangs.length === 0 || emptyLangs.length === 0) {
          completed++;
          setTranslateProgress(Math.round((completed / total) * 100));
          continue;
        }

        // Use first filled language as source
        const sourceLang = filledLangs[0];
        const sourceText = token.translations![sourceLang];

        // Translate to empty languages
        const translationResult = await translateWithAi(
          sourceText,
          sourceLang,
          emptyLangs
        );

        // Merge existing and new translations
        const updatedTranslations: Record<string, string> = {
          ...token.translations,
          ...translationResult,
        };

        // Update token
        const updatedToken = await updateToken(token.id, {
          translations: updatedTranslations,
        });

        // Update local state
        setTokens((prev) =>
          prev.map((t) => (t.id === token.id ? { ...t, ...updatedToken } : t))
        );

        completed++;
        setTranslateProgress(Math.round((completed / total) * 100));
      }

      toast({
        title: t("success.batchTranslated"),
      });
    } catch (error) {
      console.error("Batch translate error:", error);
      toast({
        title: t("errors.translateFailed"),
        variant: "destructive",
      });
    } finally {
      setIsBatchTranslating(false);
      setTimeout(() => setTranslateProgress(0), 1000);
    }
  };

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <TokenFormDrawer
        isOpen={isDrawerOpen}
        onOpenChange={(open) => setIsDrawerOpen(open)}
        isEditing={isEditing}
        isLoading={isLoading}
        isTranslating={isTranslating}
        formData={formData}
        languages={project?.languages}
        modules={project?.modules}
        currentToken={currentToken}
        onInputChange={handleInputChange}
        onModuleChange={handleModuleChange}
        onTranslationChange={handleTranslationChange}
        onScreenshotsChange={handleScreenshotsChange}
        onSubmit={handleSubmit}
        onAddNew={handleOpenAddDrawer}
        onTranslate={handleTranslate}
      />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setIsBatchDialogOpen(true)}>
            <FileText size={16} className="mr-2" />
            {t("batchAdd")}
          </Button>
          <Button onClick={handleOpenAddDrawer}>
            <Plus size={16} className="mr-2" />
            {t("addToken")}
          </Button>
        </div>
      </div>

      <BatchAddDialog
        isOpen={isBatchDialogOpen}
        onOpenChange={setIsBatchDialogOpen}
        onSubmit={handleBatchSubmit}
        isLoading={isBatchLoading}
      />

      {isBatchTranslating && (
        <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-blue-900">
              批量翻译进行中...
            </span>
            <span className="text-sm text-blue-700">{translateProgress}%</span>
          </div>
          <Progress value={translateProgress} className="h-2" />
        </div>
      )}

      {isBatchSettingModule && (
        <div className="mb-4 p-4 bg-purple-50 border border-purple-200 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-purple-900">
              批量更新模块进行中...
            </span>
            <span className="text-sm text-purple-700">{batchModuleProgress}%</span>
          </div>
          <Progress value={batchModuleProgress} className="h-2" />
        </div>
      )}

      <TokenTable
        tokens={filteredAndSortedTokens}
        languages={project?.languages || []}
        modules={project?.modules || []}
        onEdit={handleEditToken}
        onDelete={handleDeleteToken}
        onDeleteSelected={handleDeleteSelected}
        onBatchSetModule={handleBatchSetModule}
        onBatchTranslate={handleBatchTranslateSelected}
        isBatchTranslating={isBatchTranslating || isBatchSettingModule}
        toolBar={
          <div className="flex gap-2 items-center justify-between w-full">
            <div className="flex-1">
              <Input
                className="w-[400px]"
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            <div className="flex gap-2">
              <Select
                value={selectedModule || "all"}
                onValueChange={(value) => setSelectedModule(value === "all" ? null : value)}
              >
                <SelectTrigger className="h-[32px] w-[180px]">
                  <SelectValue placeholder="所有模块" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">所有模块</SelectItem>
                  <SelectItem value="__no_module__">无模块</SelectItem>
                  {(project?.modules || []).map((module) => (
                    <SelectItem key={module.code} value={module.code}>
                      {module.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select
                value={selectedTag || "all"}
                onValueChange={handleTagChange}
              >
                <SelectTrigger className="h-[32px] w-fit">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTags")}</SelectItem>
                  {allTags.map((tag, index) => (
                    <SelectItem key={index} value={tag}>
                      {tag}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        }
      />
    </div>
  );
}
