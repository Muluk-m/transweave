import { Input } from "@/components/ui/input";
import { Project } from "@/jotai/types";
import { useState } from "react";
import { ProjectCard } from "./ProjectCard";
import { NewProjectDialog } from "../teamsView/newProjectDialog";
import { Button } from "@/components/ui/button";
import { Plus, Search, FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";

interface ProjectsListProps {
  projects: Project[];
  onProjectClick: (project: Project) => void;
  onCreateProject: (project: Project) => void;
  teamId?: string;
}

export function ProjectsList({ projects, onProjectClick, onCreateProject, teamId }: ProjectsListProps) {
  const t = useTranslations("projects");
  const [searchText, setSearchText] = useState("");
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const filteredProjects = projects.filter(project => {
    const searchLower = searchText.toLowerCase();
    return project.name.toLowerCase().includes(searchLower) || 
           (project.description && project.description.toLowerCase().includes(searchLower));
  });

  return (
    <>
      {/* Search and Action Bar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        <div className="relative flex-grow">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input 
            className="pl-10 h-11 rounded-xl border-border/50 bg-muted/30 focus:bg-background transition-colors" 
            placeholder={t("searchPlaceholder")}
            value={searchText}
            onChange={(e) => setSearchText(e.target.value)}
          />
        </div>
        <Button 
          onClick={() => setIsDialogOpen(true)} 
          className="btn-gradient rounded-xl h-11 px-5"
        >
          <Plus className="h-4 w-4 mr-2" />
          {t("newProject")}
        </Button>
        <NewProjectDialog 
          isOpen={isDialogOpen}
          onOpenChange={setIsDialogOpen}
          onProjectCreated={onCreateProject}
          teamId={teamId ?? ''}
        />
      </div>

      {/* Projects Grid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredProjects.length > 0 ? (
          filteredProjects.map((project, i) => (
            <div 
              key={project.id || i}
              className="animate-fade-in-up"
              style={{ animationDelay: `${i * 50}ms` }}
            >
              <ProjectCard 
                project={project} 
                onClick={onProjectClick} 
              />
            </div>
          ))
        ) : (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted/50 mb-4">
              <FolderOpen className="h-8 w-8 text-muted-foreground" />
            </div>
            <p className="text-muted-foreground mb-4">{t("noMatchingProjects")}</p>
            <Button 
              variant="outline" 
              onClick={() => setIsDialogOpen(true)}
              className="rounded-xl"
            >
              <Plus className="h-4 w-4 mr-2" />
              创建新项目
            </Button>
          </div>
        )}
      </div>
    </>
  );
}
