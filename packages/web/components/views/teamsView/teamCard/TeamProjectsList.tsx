import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Project } from "@/jotai/types";
import { FileText, Loader2, FolderOpen } from "lucide-react";
import { useTranslations } from "next-intl";

interface TeamProjectsListProps {
    projects: Project[];
    isLoading: boolean;
    onViewAllProjects: () => void;
    onCreateProject: () => void;
    onNavigateToProject: (projectId: string) => void;
}

export function TeamProjectsList({
    projects,
    isLoading,
    onViewAllProjects,
    onCreateProject,
    onNavigateToProject
}: TeamProjectsListProps) {
    const t = useTranslations();
    const displayProjects = projects.slice(0, 3);
    const hasMoreProjects = projects.length > 3;

    return (
        <div className="px-6 pb-4">
            <div className="border rounded-lg bg-muted/20">
                {isLoading ? (
                    <div className="flex justify-center items-center py-8">
                        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
                    </div>
                ) : projects && projects.length > 0 ? (
                    <>
                        <div className="divide-y">
                            {displayProjects.map(project => (
                                <div
                                    key={project.id}
                                    onClick={() => onNavigateToProject(project.id)}
                                    className="flex items-center justify-between px-3 py-2.5 hover:bg-muted/50 cursor-pointer transition-colors first:rounded-t-lg last:rounded-b-lg"
                                >
                                    <div className="flex items-center gap-2 flex-1 min-w-0">
                                        <FileText className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <span className="text-sm font-medium truncate">{project.name}</span>
                                    </div>
                                    <Badge
                                        variant="secondary"
                                        className="text-xs ml-2 flex-shrink-0"
                                    >
                                        {t('teams.card.languagesCount', { count: project.languages?.length || 0 })}
                                    </Badge>
                                </div>
                            ))}
                        </div>

                        {hasMoreProjects && (
                            <div className="border-t">
                                <Button
                                    variant="ghost"
                                    className="w-full h-9 text-xs font-normal text-muted-foreground hover:text-foreground rounded-t-none"
                                    onClick={onViewAllProjects}
                                >
                                    {t('teams.card.viewAll')} ({projects.length})
                                </Button>
                            </div>
                        )}
                    </>
                ) : (
                    <div className="flex flex-col items-center justify-center py-8 px-4">
                        <FolderOpen className="h-8 w-8 text-muted-foreground/50 mb-2" />
                        <p className="text-sm text-muted-foreground mb-3">{t('teams.card.noProjects')}</p>
                        <Button
                            variant="outline"
                            size="sm"
                            onClick={onCreateProject}
                        >
                            {t('teams.card.createFirstProject')}
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}
