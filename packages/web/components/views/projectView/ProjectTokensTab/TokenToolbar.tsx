"use client";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useTranslations } from "next-intl";

interface TokenToolbarProps {
  searchTerm: string;
  onSearchChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
  selectedStatus: string;
  onStatusChange: (value: string) => void;
  selectedModule: string | null;
  onModuleChange: (value: string | null) => void;
  selectedTag: string | null;
  onTagChange: (tag: string) => void;
  modules: Array<{ code: string; description?: string }>;
  allTags: string[];
}

export function TokenToolbar({
  searchTerm,
  onSearchChange,
  selectedStatus,
  onStatusChange,
  selectedModule,
  onModuleChange,
  selectedTag,
  onTagChange,
  modules,
  allTags,
}: TokenToolbarProps) {
  const t = useTranslations("projectTokens");

  return (
    <div className="flex gap-2 items-center justify-between w-full">
      <div className="flex-1">
        <Input
          className="w-[400px]"
          placeholder={t("searchPlaceholder")}
          value={searchTerm}
          onChange={onSearchChange}
        />
      </div>
      <div className="flex gap-2">
        <Select value={selectedStatus} onValueChange={onStatusChange}>
          <SelectTrigger className="h-[32px] w-[140px]">
            <SelectValue placeholder={t("statusAll")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("statusAll")}</SelectItem>
            <SelectItem value="completed">{t("statusCompleted")}</SelectItem>
            <SelectItem value="incomplete">{t("statusIncomplete")}</SelectItem>
          </SelectContent>
        </Select>
        <Select
          value={selectedModule || "all"}
          onValueChange={(value) =>
            onModuleChange(value === "all" ? null : value)
          }
        >
          <SelectTrigger className="h-[32px] w-[180px]">
            <SelectValue placeholder={t("allModules")} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t("allModules")}</SelectItem>
            <SelectItem value="__no_module__">{t("noModuleFilter")}</SelectItem>
            {modules.map((module) => (
              <SelectItem key={module.code} value={module.code}>
                {module.description || module.code}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select
          value={selectedTag || "all"}
          onValueChange={onTagChange}
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
  );
}
