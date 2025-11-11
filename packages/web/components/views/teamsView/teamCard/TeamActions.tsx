import { Button } from "@/components/ui/button";
import { CardFooter } from "@/components/ui/card";
import { Team } from "@/jotai/types";
import { Loader2, UserPlus } from "lucide-react";
import { useTranslations } from "next-intl";

interface TeamActionsProps {
    team: Team;
    nowTeam: Team | null;
    loadingTeamId: string | null;
    onSelectTeam: (team: Team) => void;
    onViewMembers: () => void;
}

export function TeamActions({
    team,
    nowTeam,
    loadingTeamId,
    onSelectTeam,
    onViewMembers
}: TeamActionsProps) {
    const t = useTranslations();

    return (
        <CardFooter className="flex gap-2 pt-4">
            <Button
                variant={nowTeam?.id === team.id ? "secondary" : "default"}
                onClick={() => onSelectTeam(team)}
                disabled={loadingTeamId === team.id}
                className="flex-1"
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
                onClick={onViewMembers}
                className="flex-1"
            >
                <UserPlus className="h-4 w-4 mr-2" />
                {t('teams.card.inviteMembers')}
            </Button>
        </CardFooter>
    );
}
