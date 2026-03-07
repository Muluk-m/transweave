import { Project } from "@/jotai/types";
import { useTranslations } from "next-intl";
import { Globe, FileText, ArrowRight } from "lucide-react";
import { Progress } from "@/components/ui/progress";


interface ProjectCardProps {
  project: Project;
  onClick: (project: Project) => void;
}

export function ProjectCard({ project, onClick }: ProjectCardProps) {
  const t = useTranslations("projects");
  const tc = useTranslations("projectCard");
  const tokensCount = project.tokens?.length || 0;
  const progressValue = Math.min(tokensCount, 100);
  
  return (
    <div 
      onClick={() => onClick(project)} 
      className="group relative bg-card p-5 rounded-xl border border-border/50
        shadow-soft hover:shadow-soft-lg hover:border-primary/30
        transition-all duration-300 cursor-pointer hover:-translate-y-0.5"
    >
      {/* Card Header */}
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="flex-1 min-w-0">
          <h3 className="text-lg font-semibold text-foreground group-hover:text-primary transition-colors truncate">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-muted-foreground mt-1 line-clamp-2">
              {project.description}
            </p>
          )}
        </div>
        <div className="flex h-10 w-10 items-center justify-center rounded-lg 
          bg-gradient-to-br from-primary/10 to-accent/10 
          group-hover:from-primary/20 group-hover:to-accent/20 transition-colors flex-shrink-0">
          <Globe className="h-5 w-5 text-primary" />
        </div>
      </div>

      {/* Stats */}
      <div className="flex items-center gap-4 mb-4">
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50">
            <Globe className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {project.languages?.length || 0}
            </span>
            <span className="text-muted-foreground text-xs">{tc("languages")}</span>
          </div>
        </div>
        <div className="flex items-center gap-2 text-sm">
          <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-muted/50">
            <FileText className="h-3.5 w-3.5 text-muted-foreground" />
            <span className="font-medium text-foreground">
              {tokensCount}
            </span>
            <span className="text-muted-foreground text-xs">{tc("tokens")}</span>
          </div>
        </div>
      </div>

      {/* Languages Preview */}
      {project.languages && project.languages.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mb-4">
          {project.languages.slice(0, 4).map((lang) => (
            <span 
              key={lang}
              className="px-2 py-0.5 text-xs font-medium rounded-md bg-primary/10 text-primary"
            >
              {lang}
            </span>
          ))}
          {project.languages.length > 4 && (
            <span className="px-2 py-0.5 text-xs font-medium rounded-md bg-muted text-muted-foreground">
              +{project.languages.length - 4}
            </span>
          )}
        </div>
      )}

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{t("tokensCount", { count: tokensCount })}</span>
        </div>
        <Progress 
          value={progressValue} 
          className="h-1.5 bg-muted/50"
        />
      </div>

      {/* Hover Arrow */}
      <div className="absolute right-4 bottom-4 opacity-0 group-hover:opacity-100 transition-opacity">
        <ArrowRight className="h-4 w-4 text-primary" />
      </div>
    </div>
  );
}
