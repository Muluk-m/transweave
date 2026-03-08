import { Button } from "@/components/ui/button";
import { Plus, Users2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface EmptyTeamsViewProps {
  onCreateTeamClick: () => void;
}

export function EmptyTeamsView({ onCreateTeamClick }: EmptyTeamsViewProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border/50 rounded-lg py-16 text-center">
      <Users2 className="h-10 w-10 text-muted-foreground/25 mb-3" />
      <h3 className="text-sm font-medium mb-1 text-foreground">{t("teams.empty.title")}</h3>
      <p className="text-xs text-muted-foreground mb-4 max-w-xs">{t("teams.empty.description")}</p>
      <Button onClick={onCreateTeamClick} variant="outline" size="sm" className="h-8 text-xs">
        <Plus className="h-3.5 w-3.5 mr-1.5" />
        {t("teams.empty.createButton")}
      </Button>
    </div>
  );
}
