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
import { createToken, updateToken, deleteToken } from "@/api/project";
import { useToast } from "@/components/ui/use-toast";
import { TokenFormDrawer } from "./TokenFormDrawer";
import { TokenTable } from "./TokenTable";
import { Plus } from "lucide-react";
import { useTranslations } from "next-intl";
import { translateWithAi } from "@/api/ai";
import { useQueryState } from "nuqs";
import { getSortingStateParser } from "@/lib/parsers";

interface ProjectTokensTabProps {
  project: Project | null;
}

export function ProjectTokensTab({ project }: ProjectTokensTabProps) {
  const t = useTranslations("projectTokens");
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [tokens, setTokens] = useState<Token[]>([]);
  const { toast } = useToast();

  const [sorting] = useQueryState(
    "sort",
    getSortingStateParser<Token>().withDefault([{ id: "key", desc: true }])
  );

  const [formData, setFormData] = useState<{
    key: string;
    tags: string;
    comment: string;
    translations: Record<string, string>;
  }>({
    key: "",
    tags: "",
    comment: "",
    translations: {},
  });

  const [isEditing, setIsEditing] = useState<boolean>(false);
  const [isTranslating, setIsTranslating] = useState<boolean>(false);
  const [currentTokenId, setCurrentTokenId] = useState<string | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState<boolean>(false);

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
          if (sort.id === "key" || sort.id === "tags") {
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
  }, [tokens, selectedTag, searchTerm, sorting]);

  const isValidKey = (key: string) => {
    return /^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/.test(key);
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

  // Get translation text for a specific language
  const getTranslationText = (token: Token, lang: string): string => {
    if (!token.translations) return "";
    return token.translations[lang] || "";
  };

  // Submit form
  const handleSubmit = async () => {
    if (!isValidKey(formData.key)) {
      toast({
        title: t("errors.invalidKey"),
        variant: "destructive",
        duration: 2000,
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
          tags: tagArray,
          comment: formData.comment,
          translations: formData.translations, // Pass translations object directly
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
          tags: tagArray,
          comment: formData.comment,
          translations: formData.translations, // Pass translations object directly
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
      tags: token.tags.join(", "),
      comment: token.comment || "",
      translations,
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
        currentToken={currentToken}
        onInputChange={handleInputChange}
        onTranslationChange={handleTranslationChange}
        onSubmit={handleSubmit}
        onAddNew={handleOpenAddDrawer}
        onTranslate={handleTranslate}
      />

      <div className="flex justify-between items-center mb-4">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <Button onClick={handleOpenAddDrawer}>
          <Plus size={16} className="mr-2" />
          {t("addToken")}
        </Button>
      </div>

      <TokenTable
        tokens={filteredAndSortedTokens}
        languages={project?.languages || []}
        onEdit={handleEditToken}
        onDelete={handleDeleteToken}
        onDeleteSelected={handleDeleteSelected}
        toolBar={
          <div className="flex gap-2 items-center w-full">
            <div className="flex-1">
              <Input
                className="h-[32px]"
                placeholder={t("searchPlaceholder")}
                value={searchTerm}
                onChange={handleSearchChange}
              />
            </div>
            <Select
              value={selectedTag || "all"}
              onValueChange={handleTagChange}
            >
              <SelectTrigger className="w-full md:w-1/4 h-[32px]">
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
        }
      />
    </div>
  );
}
