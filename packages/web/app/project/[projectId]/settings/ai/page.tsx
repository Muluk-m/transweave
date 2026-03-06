"use client";

import { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { getProject } from "@/api/project";
import { Project } from "@/jotai/types";
import { LoadingView } from "@/components/views/loadingView";
import { AiProviderSettings } from "@/components/views/settings/AiProviderSettings";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronDown, ChevronRight } from "lucide-react";

export default function ProjectAiSettingsPage() {
  const { user, isLoading: authLoading } = useAuth();
  const router = useRouter();
  const params = useParams();
  const t = useTranslations("aiSettings");
  const projectId = params.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
      return;
    }

    if (projectId && user) {
      getProject(projectId)
        .then((p) => {
          setProject(p);
        })
        .catch(() => {
          router.replace("/teams");
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [projectId, user, authLoading, router]);

  if (authLoading || loading) {
    return <LoadingView />;
  }

  if (!project) {
    return null;
  }

  return (
    <div className="page-container section-spacing animate-fade-in-up max-w-3xl mx-auto">
      <div className="flex items-center gap-4 mb-6">
        <Button
          variant="ghost"
          size="icon"
          onClick={() => router.push(`/project/${projectId}`)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div>
          <h1 className="text-2xl font-bold">{t("projectSettings")}</h1>
          <p className="text-muted-foreground">{project.name}</p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Project-level AI config */}
        <AiProviderSettings
          scope="project"
          scopeId={project.id}
          projectId={project.id}
        />

        {/* Team-level AI config (collapsed by default) */}
        {project.teamId && (
          <TeamAiConfigSection teamId={project.teamId} projectId={project.id} />
        )}
      </div>
    </div>
  );
}

function TeamAiConfigSection({ teamId, projectId }: { teamId: string; projectId: string }) {
  const t = useTranslations("aiSettings");
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="space-y-2">
      <button
        onClick={() => setExpanded(!expanded)}
        className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1"
      >
        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
        {t("teamDefaultHint")}
      </button>
      {expanded && (
        <AiProviderSettings
          scope="team"
          scopeId={teamId}
          projectId={projectId}
        />
      )}
    </div>
  );
}
