'use client'

import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
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
        <div className="page-container py-8 max-w-3xl">
            {/* Header */}
            <div className="flex items-baseline justify-between mb-8">
                <div>
                    <h1 className="text-lg font-semibold text-foreground">
                        {t("teams.title")}
                    </h1>
                    {teams.length > 0 && (
                        <p className="text-sm text-muted-foreground mt-0.5">
                            {t("teamsSubtitle.teamCount", { count: teams.length })}
                        </p>
                    )}
                </div>
                <Button
                    onClick={() => setTeamDialogOpen(true)}
                    size="sm"
                    variant="outline"
                    className="h-8 text-xs"
                >
                    <Plus className="h-3.5 w-3.5 mr-1" />
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
                    <div className="space-y-10">
                        {teams.map((team) => (
                            <TeamView
                                key={team.id}
                                team={team}
                                handleSelectTeam={handleSelectTeam}
                                handleDeleteTeam={handleDeleteTeam}
                                handleViewTeamMembers={handleViewTeamMembers}
                                loadingTeamId={loadingTeamId}
                                router={router}
                            />
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
