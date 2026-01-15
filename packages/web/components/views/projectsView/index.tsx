"use client";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAtom } from "jotai";
import { nowProjectAtom, nowTeamAtom, projectsAtom, teamsAtom } from "@/jotai";
import { TeamSettingsView } from "./teamSettingsView";
import { ProjectsList } from "./ProjectsList";
import { Project } from "@/jotai/types";
import { useEffect } from "react";
import { getTeamProjects } from "@/api/project";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { FolderOpen, Settings } from "lucide-react";

export function ProjectsView() {
  const t = useTranslations("projects");
  const [projects, setProjects] = useAtom(projectsAtom);
  const [nowProject, setNowProject] = useAtom(nowProjectAtom);
  const [teams] = useAtom(teamsAtom);
  const [nowTeam, setNowTeam] = useAtom(nowTeamAtom);
  const router = useRouter();

  // 当当前团队变化时，获取该团队的所有项目
  useEffect(() => {
    if (nowTeam?.id) {
      // 加载当前团队的项目
      const loadTeamProjects = async () => {
        try {
          const teamProjects = await getTeamProjects(nowTeam.id);
          setProjects(teamProjects);
        } catch (error) {
          console.error("获取团队项目失败:", error);
        }
      };

      loadTeamProjects();
    } else {
      // 如果没有选择团队，清空项目列表
      setProjects([]);
    }
  }, [nowTeam, setProjects]);

  const handleProjectClick = (project: Project) => {
    setNowProject(project);
    // 跳转到项目详情页
    router.replace(`/project/${project.id}`);
  };

  const handleCreateProject = (project: Project) => {
    setProjects([...projects, project]);
  };

  const tabs = [
    { value: "projects", label: t("tabs.projects"), icon: FolderOpen },
    { value: "setting", label: t("tabs.settings"), icon: Settings },
  ];

  return (
    <div className="page-container section-spacing animate-fade-in-up">
      {/* Team Header */}
      {nowTeam && (
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-foreground">
            {nowTeam.name}
          </h1>
          <p className="mt-1 text-muted-foreground">
            管理团队项目和设置
          </p>
        </div>
      )}

      <Tabs defaultValue="projects" className="w-full">
        {/* Modern Tab Navigation */}
        <div className="relative mb-6">
          <TabsList className="inline-flex h-auto p-1 bg-muted/50 rounded-xl gap-1">
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
                  {tab.label}
                </TabsTrigger>
              );
            })}
          </TabsList>
        </div>

        {/* Tab Contents */}
        <div className="bg-card rounded-xl border border-border/50 shadow-soft overflow-hidden">
          <TabsContent value="projects" className="m-0 p-6 animate-fade-in">
            <ProjectsList
              projects={projects}
              onProjectClick={handleProjectClick}
              onCreateProject={handleCreateProject}
              teamId={nowTeam?.id}
            />
          </TabsContent>

          <TabsContent value="setting" className="m-0 p-6 animate-fade-in">
            <TeamSettingsView teamId={nowTeam?.id} />
          </TabsContent>
        </div>
      </Tabs>
    </div>
  );
}
