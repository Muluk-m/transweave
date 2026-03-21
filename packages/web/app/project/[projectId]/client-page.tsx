"use client";

import { useAuth } from "../../../lib/auth/auth-context";
import { useEffect, useState } from "react";
import { useRouter, usePathname } from "next/navigation";
import { LoadingView } from "../../../components/views/loadingView";
import { nowProjectAtom, nowTeamAtom } from "@/jotai";
import { useAtom } from "jotai";
import { getTeamById } from "@/api/team";
import NoPermissionView from "../../../components/views/noPermissionView";
import { ProjectView } from "@/components/views/projectView";
import { checkProjectPermission, getProject } from "@/api/project";
import { useTranslations } from "next-intl";

export function ProjectPage() {
  const [nowProject, setNowProject] = useAtom(nowProjectAtom);
  const [, setNowTeam] = useAtom(nowTeamAtom);
  const { user, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [isCheckingPermission, setIsCheckingPermission] = useState(true);
  const t = useTranslations();

  // Extract projectId from URL path instead of useParams(),
  // because static export + Vercel rewrite makes useParams() return '_'
  const projectId = pathname.match(/\/project\/([^/]+)/)?.[1] || "";

  const check = async () => {
    if (user && projectId) {
      try {
        // Get project details and restore team context from URL
        const project = await getProject(projectId);
        setNowProject(project);
        if (project.teamId) {
          try {
            const team = await getTeamById(project.teamId);
            setNowTeam(team);
          } catch {
            // non-critical
          }
        }

        // Check if user has permission to access the project
        const hasAccess = await checkProjectPermission(projectId);
        setHasPermission(hasAccess);
      } catch (error) {
        console.error("Failed to check project permission:", error);
        setHasPermission(false);
      } finally {
        setIsCheckingPermission(false);
      }
    }
  };

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/");
    }
    if (projectId) {
      setHasPermission(null);
      setIsCheckingPermission(true);
      check();
    }
  }, [user, isLoading, projectId, setNowProject]);

  if (isLoading || isCheckingPermission) {
    return <LoadingView />;
  }

  if (hasPermission === false) {
    return <NoPermissionView teamId={nowProject?.teamId || ""} />;
  }

  return <ProjectView />;
}
