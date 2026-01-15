import { Button } from "@/components/ui/button";
import { Plus, Users2 } from "lucide-react";
import { useTranslations } from "next-intl";

interface EmptyTeamsViewProps {
  onCreateTeamClick: () => void;
}

export function EmptyTeamsView({ onCreateTeamClick }: EmptyTeamsViewProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col items-center justify-center border border-dashed border-border/50 rounded-xl p-8 text-center bg-muted/20">
      <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 mb-4">
        <Users2 className="h-6 w-6 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-1 text-foreground">{t("teams.empty.title")}</h3>
      <p className="text-sm text-muted-foreground mb-4 max-w-xs">{t("teams.empty.description")}</p>
      <Button onClick={onCreateTeamClick} className="btn-gradient rounded-lg h-9">
        <Plus className="h-4 w-4 mr-1.5" />
        {t("teams.empty.createButton")}
      </Button>
    </div>
  );
}