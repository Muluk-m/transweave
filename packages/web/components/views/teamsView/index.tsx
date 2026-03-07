'use client'

import { Button } from "@/components/ui/button";
import { Plus, Users2 } from "lucide-react";
import { useHooks } from "./useHooks";
import { CreateTeamDialog } from "./CreateTeamDialog";
import { EmptyTeamsView } from "./EmptyTeamsView";
import { TeamView } from "./teamCard/index";
import { LoadingTeamsView } from "./LoadingTeamsView";
import { useEffect } from "react";
import { useTranslations } from "next-intl";

export default function TeamsView() {
    const {
        teams,
        newTeamName,
        newTeamUrl,
        teamDialogOpen,
        loading,
        loadingTeamId,
        setNewTeamName,
        setNewTeamUrl,
        setTeamDialogOpen,
        handleSelectTeam,
        handleCreateTeam,
        handleDeleteTeam,
        handleViewTeamMembers,
        router,
        loadTeams,
        toast
    } = useHooks();
    const t = useTranslations();

    useEffect(() => {
        loadTeams().catch(error => {
            toast({
                title: t("teams.loadFailed"),
                description: error instanceof Error ? error.message : t("teams.loadFailedDescription"),
                variant: "destructive"
            });
        });
    }, []);
    
    return (
        <div className="page-container py-6">
            {/* Header - 更紧凑的顶部栏 */}
            <div className="flex items-center justify-between mb-6">
                <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
                        <Users2 className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                        <h1 className="text-xl font-semibold text-foreground">
                            {t("teams.title")}
                        </h1>
                        <p className="text-sm text-muted-foreground">
                            {teams.length > 0 ? t("teamsSubtitle.teamCount", { count: teams.length }) : t("teamsSubtitle.createFirst")}
                        </p>
                    </div>
                </div>
                <Button 
                    onClick={() => setTeamDialogOpen(true)}
                    className="btn-gradient rounded-lg h-9 px-4"
                >
                    <Plus className="h-4 w-4 mr-1.5" />
                    {t("teams.createTeam")}
                </Button>
            </div>

            {/* Content */}
            <div className="animate-fade-in">
                {loading && <LoadingTeamsView />}

                {!loading && !teams.length && (
                    <EmptyTeamsView onCreateTeamClick={() => setTeamDialogOpen(true)} />
                )}

                {!loading && !!teams.length && (
                    <div className="space-y-3">
                        {teams.map((team, index) => (
                            <div 
                                key={team.id}
                                className="animate-fade-in"
                                style={{ animationDelay: `${index * 30}ms` }}
                            >
                                <TeamView
                                    team={team}
                                    handleSelectTeam={handleSelectTeam}
                                    handleDeleteTeam={handleDeleteTeam}
                                    handleViewTeamMembers={handleViewTeamMembers}
                                    loadingTeamId={loadingTeamId}
                                    router={router}
                                />
                            </div>
                        ))}
                    </div>
                )}
            </div>

            <CreateTeamDialog
                isOpen={teamDialogOpen}
                onOpenChange={setTeamDialogOpen}
                newTeamName={newTeamName}
                newTeamUrl={newTeamUrl}
                onNewTeamNameChange={setNewTeamName}
                onNewTeamUrlChange={setNewTeamUrl}
                onCreateTeam={handleCreateTeam}
                isLoading={loading}
            />
        </div>
    );
}
