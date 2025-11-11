import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Link, Settings, Pencil, Trash2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface TeamHeaderProps {
    name: string;
    url?: string;
    onEditTeam: () => void;
    onDeleteTeam: () => void;
}

export function TeamHeader({ name, url, onEditTeam, onDeleteTeam }: TeamHeaderProps) {
    const t = useTranslations();

    return (
        <CardHeader className="pb-3">
            <div className="flex justify-between items-start gap-2">
                <div className="flex-1 min-w-0">
                    <CardTitle className="text-lg">{name}</CardTitle>
                    <CardDescription className="flex items-center mt-1 text-xs">
                        <Link className="h-3 w-3 mr-1 flex-shrink-0" />
                        <span className="truncate">bondma.com/team/{url}</span>
                    </CardDescription>
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
                        <DropdownMenuItem onClick={onEditTeam}>
                            <Pencil className="h-4 w-4 mr-2" />
                            {t('teams.card.editTeam')}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem
                            onClick={onDeleteTeam}
                            className="text-destructive focus:text-destructive"
                        >
                            <Trash2 className="h-4 w-4 mr-2" />
                            {t('teams.card.deleteTeam')}
                        </DropdownMenuItem>
                    </DropdownMenuContent>
                </DropdownMenu>
            </div>
        </CardHeader>
    );
}
