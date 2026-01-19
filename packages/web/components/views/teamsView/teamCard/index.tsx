'use client'

import { updateTeam } from "@/api/team";
import { nowTeamAtom, teamsAtom } from "@/jotai";
import { Team } from "@/jotai/types";
import { AppRouterInstance } from "next/dist/shared/lib/app-router-context.shared-runtime";
import { useState } from "react";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, Settings, Pencil, Trash2, Users, Folder, Loader2, UserPlus, Plus } from "lucide-react";
import { TeamProjectsDialog } from "./teamProjectsDialog";
import { NewProjectDialog } from "../newProjectDialog";
import { TeamMembersDialog } from "../teamMembersDialog";
import { EditTeamDialog } from "../EditTeamDialog";
import { useTeamProjectsData } from "./useHooks";

export function TeamView(props: {
    team: Team;
    handleSelectTeam: (team: Team) => void;
    handleViewTeamMembers: (teamId: string) => void;
    handleDeleteTeam: (teamId: string) => void;
    loadingTeamId: string | null;
    router: AppRouterInstance;
}) {
    const { team, handleSelectTeam, handleDeleteTeam, loadingTeamId, router } = props;
    const [nowTeam] = useAtom(nowTeamAtom);
    const [teams, setTeams] = useAtom(teamsAtom);
    const t = useTranslations();
    const maxVisibleProjects = 6;

    // Use custom hook to get project data
    const { projects, setProjects, isLoading } = useTeamProjectsData(team.id);

    // Dialog states
    const [showProjectsDialog, setShowProjectsDialog] = useState(false);
    const [showNewProjectDialog, setShowNewProjectDialog] = useState(false);
    const [showMembersDialog, setShowMembersDialog] = useState(false);
    const [editDialogOpen, setEditDialogOpen] = useState(false);
    const [teamName, setTeamName] = useState(team.name);
    const [teamUrl, setTeamUrl] = useState(team.url || "");
    const [isUpdating, setIsUpdating] = useState(false);

    const handleNavigateToProject = (projectId: string) => {
        router.push(`/project/${projectId}`);
    };

    const handleOpenProjectsDialog = () => {
        setShowProjectsDialog(true);
    };

    const handleViewMembers = () => {
        setShowMembersDialog(true);
    };

    const handleUpdateTeam = async () => {
        if (!teamName.trim()) {
            return;
        }

        try {
            setIsUpdating(true);
            const updatedTeam = await updateTeam(team.id, { name: teamName, url: teamUrl });
            setTeams(teams.map(t => t.id === team.id ? updatedTeam : t));
            setEditDialogOpen(false);
        } catch (error) {
            console.error("Failed to update team:", error);
        } finally {
            setIsUpdating(false);
        }
    };

    const openEditDialog = () => {
        setTeamName(team.name);
        setTeamUrl(team.url || "");
        setEditDialogOpen(true);
    };

    return (
        <>
            <div className={`
                group relative
                bg-card border rounded-lg
                transition-all duration-200 
                hover:border-primary/30
                ${nowTeam?.id === team.id ? 'border-primary/50 ring-1 ring-primary/20' : 'border-border/50'}
            `}>
                {/* 单行布局 */}
                <div className="flex items-center gap-4 p-4">
                    {/* 团队图标 */}
                    <div className={`
                        flex h-10 w-10 items-center justify-center rounded-lg flex-shrink-0
                        ${nowTeam?.id === team.id 
                            ? 'bg-primary/10' 
                            : 'bg-muted/50 group-hover:bg-primary/10'}
                        transition-colors
                    `}>
                        <Users className={`h-5 w-5 ${nowTeam?.id === team.id ? 'text-primary' : 'text-muted-foreground group-hover:text-primary'} transition-colors`} />
                    </div>

                    {/* 团队信息 */}
                    <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-foreground truncate">
                                {team.name}
                            </h3>
                            {nowTeam?.id === team.id && (
                                <span className="text-xs px-1.5 py-0.5 rounded bg-primary/10 text-primary flex-shrink-0">
                                    当前
                                </span>
                            )}
                        </div>
                        <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                            <Link className="h-3 w-3 flex-shrink-0" />
                            <span className="truncate">bondma.com/team/{team.url}</span>
                        </div>
                    </div>

                    {/* 统计信息 */}
                    <div className="hidden sm:flex items-center gap-2 text-sm flex-shrink-0">
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 text-muted-foreground">
                            <Users className="h-3.5 w-3.5" />
                            <span>{team.memberships?.length || 0}</span>
                        </div>
                        <div className="flex items-center gap-1.5 px-2 py-1 rounded-md bg-muted/30 text-muted-foreground">
                            <Folder className="h-3.5 w-3.5" />
                            <span>{projects?.length || 0}</span>
                        </div>
                    </div>

                    {/* 操作按钮 */}
                    <div className="flex items-center gap-2 flex-shrink-0">
                        <Button
                            variant={nowTeam?.id === team.id ? "secondary" : "default"}
                            onClick={() => handleSelectTeam(team)}
                            disabled={loadingTeamId === team.id}
                            size="sm"
                            className={`rounded-lg h-8 ${nowTeam?.id !== team.id ? 'btn-gradient' : ''}`}
                        >
                            {loadingTeamId === team.id ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                t('teams.card.enterTeam')
                            )}
                        </Button>
                        <Button
                            variant="ghost"
                            onClick={handleViewMembers}
                            size="icon"
                            className="h-8 w-8 rounded-lg hover:bg-muted"
                        >
                            <UserPlus className="h-4 w-4" />
                        </Button>
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 rounded-lg hover:bg-muted"
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={openEditDialog} className="cursor-pointer">
                                    <Pencil className="h-4 w-4 mr-2" />
                                    {t('teams.card.editTeam')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => handleDeleteTeam(team.id)}
                                    className="text-destructive focus:text-destructive cursor-pointer"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('teams.card.deleteTeam')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* 项目列表 - 折叠在下方，仅在有项目时显示 */}
                {!isLoading && projects && projects.length > 0 && (
                    <div className="border-t border-border/30 px-4 py-2 bg-muted/20">
                        <div className="flex items-center justify-between gap-2 mb-2">
                            <div className="text-xs text-muted-foreground">
                                {t('teams.card.projectList')} · {t('teams.card.projectsCount', { count: projects.length })}
                            </div>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={handleOpenProjectsDialog}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                            >
                                {t('teams.card.viewAllProjects')}
                            </Button>
                        </div>
                        <div className="flex items-center gap-2 flex-wrap">
                            {projects.slice(0, maxVisibleProjects).map(project => (
                                <div
                                    key={project.id}
                                    onClick={() => handleNavigateToProject(project.id)}
                                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-md 
                                        bg-card hover:bg-primary/5 border border-border/50 hover:border-primary/30
                                        cursor-pointer transition-all text-sm group/item"
                                >
                                    <Folder className="h-3.5 w-3.5 text-muted-foreground group-hover/item:text-primary" />
                                    <span className="truncate max-w-[120px] group-hover/item:text-primary">
                                        {project.name}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                        {project.languages?.length || 0}
                                    </span>
                                </div>
                            ))}
                            {projects.length > maxVisibleProjects && (
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={handleOpenProjectsDialog}
                                    className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                                >
                                    {t('teams.card.viewMore', { count: projects.length - maxVisibleProjects })}
                                </Button>
                            )}
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowNewProjectDialog(true)}
                                className="h-7 px-2 text-xs text-muted-foreground hover:text-primary"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                {t('teams.card.newProject')}
                            </Button>
                        </div>
                    </div>
                )}

                {/* 空项目提示 - 简洁版 */}
                {!isLoading && (!projects || projects.length === 0) && (
                    <div className="border-t border-border/30 px-4 py-2 bg-muted/20">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowNewProjectDialog(true)}
                            className="h-7 text-xs text-muted-foreground hover:text-primary"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            创建第一个项目
                        </Button>
                    </div>
                )}

                {/* 加载状态 */}
                {isLoading && (
                    <div className="border-t border-border/30 px-4 py-2 bg-muted/20">
                        <div className="flex items-center gap-2 text-xs text-muted-foreground">
                            <Loader2 className="h-3 w-3 animate-spin" />
                            加载项目中...
                        </div>
                    </div>
                )}
            </div>

            {/* Dialog components */}
            <TeamProjectsDialog
                isOpen={showProjectsDialog}
                onOpenChange={setShowProjectsDialog}
                team={team}
                projects={projects}
                setProjects={setProjects}
                onNewProject={() => setShowNewProjectDialog(true)}
                onNavigateToProject={handleNavigateToProject}
            />

            <NewProjectDialog
                isOpen={showNewProjectDialog}
                onOpenChange={setShowNewProjectDialog}
                teamId={team.id}
                onProjectCreated={(newProject) => {
                    setProjects([...projects, newProject]);
                }}
            />

            <TeamMembersDialog
                isOpen={showMembersDialog}
                onOpenChange={setShowMembersDialog}
                team={team}
            />

            <EditTeamDialog
                isOpen={editDialogOpen}
                onOpenChange={setEditDialogOpen}
                teamName={teamName}
                teamUrl={teamUrl}
                onTeamNameChange={setTeamName}
                onTeamUrlChange={setTeamUrl}
                onUpdateTeam={handleUpdateTeam}
                isLoading={isUpdating}
            />
        </>
    );
}
