"use client";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAtom } from "jotai";
import { nowProjectAtom } from "@/jotai";
import { ProjectOverviewTab } from "@/components/views/projectView/ProjectOverviewTab";
import { ProjectTokensTab } from "@/components/views/projectView/ProjectTokensTab";
import { ProjectModulesTab } from "@/components/views/projectView/ProjectModulesTab";
import { ProjectImportTab } from "@/components/views/projectView/ProjectImportTab";
import { ProjectExportTab } from "@/components/views/projectView/ProjectExportTab";
import { ProjectSettingTab } from "@/components/views/projectView/ProjectSettingTab";
import { ProjectActivityTab } from "@/components/views/projectView/ProjectActivityTab";
import { useTranslations } from "next-intl";
import {
  BarChart3,
  FileText,
  Boxes,
  Download,
  Upload,
  Activity,
  Settings,
} from "lucide-react";

export function ProjectView() {
  const [nowProject] = useAtom(nowProjectAtom);
  const t = useTranslations();

  const tabs = [
    { value: "overview", label: t("project.tabs.overview"), icon: BarChart3 },
    { value: "tokens", label: t("project.tabs.tokens"), icon: FileText },
    { value: "modules", label: "模块管理", icon: Boxes },
    { value: "import", label: t("project.tabs.import"), icon: Upload },
    { value: "export", label: t("project.tabs.export"), icon: Download },
    { value: "activity", label: t("project.tabs.activity"), icon: Activity },
    { value: "setting", label: t("project.tabs.setting"), icon: Settings },
  ];

  return (
    <div className="page-container section-spacing animate-fade-in-up">
      {/* Project Header */}
      {nowProject && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {nowProject.name}
          </h1>
          {nowProject.description && (
            <p className="mt-1 text-muted-foreground">
              {nowProject.description}
            </p>
          )}
        </div>
      )}

      <Tabs defaultValue="overview" className="w-full">
        {/* Modern Tab Navigation */}
        <div className="relative mb-6">
          <TabsList className="inline-flex h-auto p-1 bg-muted/50 rounded-xl gap-1 flex-wrap">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <TabsTrigger
                  key={tab.value}
                  value={tab.value}
                  className="inline-flex items-center gap-2 px-4 py-2.5 text-sm font-medium rounded-lg
                    text-muted-foreground hover:text-foreground
                    data-[state=active]:bg-background data-[state=active]:text-foreground 
                    data-[state=active]:shadow-sm data-[state=active]:shadow-black/5
                    transition-all duration-200"
                >
                  <Icon className="h-4 w-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tab Contents with Animation */}
        <div className="bg-card rounded-xl border border-border/50 shadow-soft overflow-hidden">
          <TabsContent value="overview" className="m-0 p-6 animate-fade-in">
            <ProjectOverviewTab project={nowProject} />
          </TabsContent>

          <TabsContent value="tokens" className="m-0 p-6 animate-fade-in">
            <ProjectTokensTab project={nowProject} />
          </TabsContent>

          <TabsContent value="modules" className="m-0 p-6 animate-fade-in">
            <ProjectModulesTab />
          </TabsContent>

          <TabsContent value="import" className="m-0 p-6 animate-fade-in">
            <ProjectImportTab project={nowProject} />
          </TabsContent>

          <TabsContent value="export" className="m-0 p-6 animate-fade-in">
            <ProjectExportTab project={nowProject} />
          </TabsContent>

          <TabsContent value="activity" className="m-0 p-6 animate-fade-in">
            <ProjectActivityTab project={nowProject} />
          </TabsContent>

          <TabsContent value="setting" className="m-0 p-6 animate-fade-in">
            <ProjectSettingTab project={nowProject} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
