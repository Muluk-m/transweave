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
import { Settings, Pencil, Trash2, Users, Folder, Loader2, UserPlus, Plus, ArrowRight } from "lucide-react";
import { TeamProjectsDialog } from "./teamProjectsDialog";
import { NewProjectDialog } from "../newProjectDialog";
import { TeamMembersDialog } from "../teamMembersDialog";
import { EditTeamDialog } from "../EditTeamDialog";
import { useTeamProjectsData } from "./useHooks";
import { useAuth } from "@/lib/auth/auth-context";
import { canDeleteTeam, canEditTeam, canManageMembers } from "@/lib/permissions";

export function TeamView(props: {
    team: Team;
    handleSelectTeam: (team: Team) => void;
    handleViewTeamMembers: (teamId: string) => void;
    handleDeleteTeam: (teamId: string) => void;
    loadingTeamId: string | null;
    router: AppRouterInstance;
}) {
    const { team, handleSelectTeam, handleDeleteTeam, router } = props;
    const [nowTeam, setNowTeam] = useAtom(nowTeamAtom);
    const [teams, setTeams] = useAtom(teamsAtom);
    const t = useTranslations();
    const { user } = useAuth();
    const userId = user?.userId ?? '';
    const showEdit = canEditTeam(team, userId);
    const showDelete = canDeleteTeam(team, userId);
    const showMembers = canManageMembers(team, userId);
    const maxVisibleProjects = 10;

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
        setNowTeam(team);
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

    const isCurrent = nowTeam?.id === team.id;
    const hasDropdown = showEdit || showDelete || showMembers;

    return (
        <>
            <div>
                {/* Team section header */}
                <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                        <h2 className="text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                            {team.name}
                        </h2>
                        {isCurrent && (
                            <span className="text-[10px] leading-none px-1.5 py-0.5 rounded-full bg-primary/15 text-primary font-medium">
                                {t('teams.card.current')}
                            </span>
                        )}
                        <span className="text-[11px] text-muted-foreground/50">
                            <Users className="h-3 w-3 inline-block mr-0.5 -mt-px" />
                            {team.memberships?.length || 0}
                        </span>
                    </div>
                    <div className="flex items-center gap-1">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => setShowNewProjectDialog(true)}
                            className="h-7 px-2 text-xs text-muted-foreground hover:text-foreground"
                        >
                            <Plus className="h-3 w-3 mr-1" />
                            {t('teams.card.newProject')}
                        </Button>
                        {hasDropdown && (
                            <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                    <Button
                                        variant="ghost"
                                        size="icon"
                                        className="h-7 w-7 text-muted-foreground hover:text-foreground"
                                    >
                                        <Settings className="h-3.5 w-3.5" />
                                    </Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end">
                                    {!isCurrent && (
                                        <DropdownMenuItem onClick={() => handleSelectTeam(team)} className="cursor-pointer text-xs">
                                            <Users className="h-3.5 w-3.5 mr-2" />
                                            {t('teams.card.enterTeam')}
                                        </DropdownMenuItem>
                                    )}
                                    {showMembers && (
                                        <DropdownMenuItem onClick={handleViewMembers} className="cursor-pointer text-xs">
                                            <UserPlus className="h-3.5 w-3.5 mr-2" />
                                            {t('teams.card.inviteMembers')}
                                        </DropdownMenuItem>
                                    )}
                                    {showEdit && (
                                        <DropdownMenuItem onClick={openEditDialog} className="cursor-pointer text-xs">
                                            <Pencil className="h-3.5 w-3.5 mr-2" />
                                            {t('teams.card.editTeam')}
                                        </DropdownMenuItem>
                                    )}
                                    {showDelete && (
                                        <>
                                            <DropdownMenuSeparator />
                                            <DropdownMenuItem
                                                onClick={() => handleDeleteTeam(team.id)}
                                                className="text-destructive focus:text-destructive cursor-pointer text-xs"
                                            >
                                                <Trash2 className="h-3.5 w-3.5 mr-2" />
                                                {t('teams.card.deleteTeam')}
                                            </DropdownMenuItem>
                                        </>
                                    )}
                                </DropdownMenuContent>
                            </DropdownMenu>
                        )}
                    </div>
                </div>

                {/* Project list */}
                <div className="border border-border/60 rounded-lg overflow-hidden">
                    {/* Loading */}
                    {isLoading && (
                        <div className="px-4 py-8 flex items-center justify-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mr-2" />
                            {t('teams.card.loading')}
                        </div>
                    )}

                    {/* Project rows */}
                    {!isLoading && projects && projects.length > 0 && (
                        <>
                            {projects.slice(0, maxVisibleProjects).map((project, idx) => (
                                <div
                                    key={project.id}
                                    onClick={() => handleNavigateToProject(project.id)}
                                    className={`
                                        flex items-center gap-3 px-4 py-2.5
                                        cursor-pointer transition-colors
                                        hover:bg-muted/50 group
                                        ${idx > 0 ? 'border-t border-border/40' : ''}
                                    `}
                                >
                                    <Folder className="h-4 w-4 text-muted-foreground/60 group-hover:text-primary flex-shrink-0 transition-colors" />
                                    <span className="text-sm font-medium text-foreground group-hover:text-primary transition-colors flex-1 truncate">
                                        {project.name}
                                    </span>
                                    {(project.languages?.length ?? 0) > 0 && (
                                        <span className="text-xs text-muted-foreground tabular-nums">
                                            {t('teams.card.languagesCount', { count: project.languages?.length || 0 })}
                                        </span>
                                    )}
                                    <ArrowRight className="h-3.5 w-3.5 text-transparent group-hover:text-muted-foreground/60 transition-colors flex-shrink-0" />
                                </div>
                            ))}
                            {projects.length > maxVisibleProjects && (
                                <div className="border-t border-border/40 px-4 py-2 text-center">
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={handleOpenProjectsDialog}
                                        className="h-7 px-3 text-xs text-muted-foreground hover:text-primary"
                                    >
                                        {t('teams.card.viewMore', { count: projects.length - maxVisibleProjects })}
                                    </Button>
                                </div>
                            )}
                        </>
                    )}

                    {/* Empty state */}
                    {!isLoading && (!projects || projects.length === 0) && (
                        <div className="px-4 py-10 text-center">
                            <Folder className="h-8 w-8 text-muted-foreground/20 mx-auto mb-2" />
                            <p className="text-sm text-muted-foreground mb-3">
                                {t('teams.card.noProjects')}
                            </p>
                            <Button
                                variant="outline"
                                size="sm"
                                onClick={() => setShowNewProjectDialog(true)}
                                className="h-7 text-xs"
                            >
                                <Plus className="h-3 w-3 mr-1" />
                                {t('teams.card.createFirstProject')}
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            {/* Dialogs */}
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
