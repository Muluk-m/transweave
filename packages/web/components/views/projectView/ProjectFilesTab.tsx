"use client";
import { Project } from "@/jotai/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Upload, Download } from "lucide-react";
import { ProjectImportTab } from "./ProjectImportTab";
import { ProjectExportTab } from "./ProjectExportTab";
import { useTranslations } from "next-intl";

interface ProjectFilesTabProps {
  project: Project | null;
}

export function ProjectFilesTab({ project }: ProjectFilesTabProps) {
  const t = useTranslations();

  return (
    <Tabs defaultValue="import" className="w-full">
      <TabsList className="mb-6 inline-flex h-auto p-1 bg-muted/50 rounded-xl gap-1">
        <TabsTrigger
          value="import"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
            text-muted-foreground hover:text-foreground
            data-[state=active]:bg-background data-[state=active]:text-foreground
            data-[state=active]:shadow-sm transition-all duration-200"
        >
          <Upload className="h-4 w-4" />
          {t("project.tabs.import")}
        </TabsTrigger>
        <TabsTrigger
          value="export"
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-lg
            text-muted-foreground hover:text-foreground
            data-[state=active]:bg-background data-[state=active]:text-foreground
            data-[state=active]:shadow-sm transition-all duration-200"
        >
          <Download className="h-4 w-4" />
          {t("project.tabs.export")}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="import" className="m-0">
        <ProjectImportTab project={project} />
      </TabsContent>

      <TabsContent value="export" className="m-0">
        <ProjectExportTab project={project} />
      </TabsContent>
    </Tabs>
  );
}
