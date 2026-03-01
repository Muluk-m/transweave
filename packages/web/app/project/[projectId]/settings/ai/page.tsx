"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { getProject } from "@/api/project";
import { Project } from "@/jotai/types";
import { LoadingView } from "@/components/views/loadingView";
import { AiProviderSettings } from "@/components/views/settings/AiProviderSettings";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { ArrowLeft } from "lucide-react";

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

        {/* Team-level AI config */}
        {project.teamId && (
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground px-1">
              {t("teamDefaultHint")}
            </p>
            <AiProviderSettings
              scope="team"
              scopeId={project.teamId}
              projectId={project.id}
            />
          </div>
        )}
      </div>
    </div>
  );
}
