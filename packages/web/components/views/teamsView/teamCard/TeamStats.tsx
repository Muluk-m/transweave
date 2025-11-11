import { Folder, Users } from "lucide-react";
import { useTranslations } from "next-intl";

interface TeamStatsProps {
    memberCount: number;
    projectCount: number;
}

export function TeamStats({ memberCount, projectCount }: TeamStatsProps) {
    const t = useTranslations();

    return (
        <div className="px-6 pb-3">
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <div className="flex items-center gap-1.5">
                    <Users className="h-4 w-4" />
                    <span>{t('teams.card.membersCount', { count: memberCount })}</span>
                </div>

                <div className="flex items-center gap-1.5">
                    <Folder className="h-4 w-4" />
                    <span>{t('teams.card.projectsCount', { count: projectCount })}</span>
                </div>
            </div>
        </div>
    );
}
