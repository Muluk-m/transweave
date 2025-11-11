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
import { Link, Settings, Pencil, Trash2, Users, Folder, Loader2, UserPlus, ExternalLink } from "lucide-react";
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
            <div className={`border rounded-lg p-4 hover:border-primary/50 transition-colors ${nowTeam?.id === team.id ? 'border-primary bg-primary/5' : ''}`}>
                {/* Header row */}
                <div className="flex items-start justify-between gap-4 mb-3">
                    <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-semibold mb-1">{team.name}</h3>
                        <div className="flex items-center text-xs text-muted-foreground">
                            <Link className="h-3 w-3 mr-1.5 flex-shrink-0" />
                            <span className="truncate">bondma.com/team/{team.url}</span>
                        </div>
                    </div>

                    {/* Stats and settings */}
                    <div className="flex items-center gap-4">
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                            <div className="flex items-center gap-1.5">
                                <Users className="h-4 w-4" />
                                <span>{team.memberships?.length || 0}</span>
                            </div>
                            <div className="flex items-center gap-1.5">
                                <Folder className="h-4 w-4" />
                                <span>{projects?.length || 0}</span>
                            </div>
                        </div>

                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-8 w-8 flex-shrink-0"
                                >
                                    <Settings className="h-4 w-4" />
                                </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={openEditDialog}>
                                    <Pencil className="h-4 w-4 mr-2" />
                                    {t('teams.card.editTeam')}
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem
                                    onClick={() => handleDeleteTeam(team.id)}
                                    className="text-destructive focus:text-destructive"
                                >
                                    <Trash2 className="h-4 w-4 mr-2" />
                                    {t('teams.card.deleteTeam')}
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </div>

                {/* Projects section */}
                <div className="mt-3 pt-3 border-t">
                    {isLoading ? (
                        <div className="flex items-center justify-center py-4">
                            <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                        </div>
                    ) : projects && projects.length > 0 ? (
                        <div className="max-h-48 overflow-y-auto space-y-1.5">
                            {projects.map(project => (
                                <div
                                    key={project.id}
                                    onClick={() => handleNavigateToProject(project.id)}
                                    className="flex items-center gap-2 px-2 py-1.5 rounded hover:bg-muted cursor-pointer transition-colors"
                                >
                                    <Folder className="h-3.5 w-3.5 text-muted-foreground flex-shrink-0" />
                                    <span className="text-sm truncate flex-1">{project.name}</span>
                                    <span className="text-xs text-muted-foreground flex-shrink-0">
                                        {project.languages?.length || 0} langs
                                    </span>
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-4">
                            <p className="text-sm text-muted-foreground mb-2">
                                {t('teams.card.noProjects')}
                            </p>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setShowNewProjectDialog(true)}
                                className="text-xs"
                            >
                                {t('teams.card.createFirstProject')}
                            </Button>
                        </div>
                    )}
                </div>

                {/* Actions row */}
                <div className="flex items-center gap-2 mt-4">
                    <Button
                        variant={nowTeam?.id === team.id ? "secondary" : "default"}
                        onClick={() => handleSelectTeam(team)}
                        disabled={loadingTeamId === team.id}
                        size="sm"
                    >
                        {loadingTeamId === team.id ? (
                            <>
                                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                                {t('teams.card.loading')}
                            </>
                        ) : (
                            t('teams.card.enterTeam')
                        )}
                    </Button>
                    <Button
                        variant="outline"
                        onClick={handleViewMembers}
                        size="sm"
                    >
                        <UserPlus className="h-4 w-4 mr-2" />
                        {t('teams.card.inviteMembers')}
                    </Button>
                </div>
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
