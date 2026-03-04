'use client';

import { useEffect, useState, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import { useAtom } from 'jotai';
import { teamsAtom, nowTeamAtom } from '@/jotai';
import { fetchMyTeams } from '@/api/team';
import { getTeamProjects } from '@/api/project';
import { Team, Project } from '@/jotai/types';
import { Button } from '@/components/ui/button';
import { useTranslations } from 'next-intl';
import {
  ChevronDown,
  ChevronRight,
  Folder,
  Users,
  Key,
  Settings,
  PanelLeftClose,
  PanelLeft,
  Loader2,
} from 'lucide-react';
import { Logo } from '@/components/Logo';
import Link from 'next/link';

const COLLAPSED_KEY = 'sidebar-collapsed';

interface TeamWithProjects extends Team {
  projects?: Project[];
  projectsLoaded?: boolean;
  expanded?: boolean;
}

export function SidebarView() {
  const t = useTranslations();
  const pathname = usePathname();
  const router = useRouter();

  const [teams, setTeams] = useAtom(teamsAtom);
  const [, setNowTeam] = useAtom(nowTeamAtom);

  const [teamsWithProjects, setTeamsWithProjects] = useState<TeamWithProjects[]>([]);
  const [loading, setLoading] = useState(true);
  const [collapsed, setCollapsed] = useState(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem(COLLAPSED_KEY) === 'true';
    }
    return false;
  });

  // Extract current projectId from URL
  const currentProjectId = pathname.match(/\/project\/([^/]+)/)?.[1] ?? null;

  const toggleCollapsed = () => {
    setCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem(COLLAPSED_KEY, String(next));
      return next;
    });
  };

  const loadProjects = useCallback(async (teamId: string) => {
    try {
      const projects = await getTeamProjects(teamId);
      setTeamsWithProjects((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, projects, projectsLoaded: true } : t
        )
      );
    } catch {
      setTeamsWithProjects((prev) =>
        prev.map((t) =>
          t.id === teamId ? { ...t, projects: [], projectsLoaded: true } : t
        )
      );
    }
  }, []);

  const toggleTeam = (teamId: string) => {
    setTeamsWithProjects((prev) =>
      prev.map((t) => {
        if (t.id !== teamId) return t;
        const next = { ...t, expanded: !t.expanded };
        if (next.expanded && !next.projectsLoaded) {
          loadProjects(teamId);
        }
        return next;
      })
    );
  };

  useEffect(() => {
    const load = async () => {
      try {
        const data = await fetchMyTeams();
        setTeams(data);
        // Auto-expand team that owns current project (lazy: expand all initially)
        const expanded = data.map((team) => ({
          ...team,
          expanded: true,
          projects: undefined,
          projectsLoaded: false,
        }));
        setTeamsWithProjects(expanded);
        // Load projects for all teams in parallel
        expanded.forEach((team) => loadProjects(team.id));
      } finally {
        setLoading(false);
      }
    };
    load();
  }, []);

  const handleProjectClick = (project: Project, team: Team) => {
    setNowTeam(team);
    router.push(`/project/${project.id}`);
  };

  if (collapsed) {
    return (
      <div className="flex flex-col h-full w-[52px] border-r border-border/50 bg-background/95 flex-shrink-0 transition-all duration-200">
        {/* Logo */}
        <div className="flex items-center justify-center h-16 border-b border-border/40">
          <Logo className="h-6 w-6" />
        </div>

        {/* Teams as icons */}
        <div className="flex-1 overflow-y-auto py-3 flex flex-col gap-1 items-center">
          {teamsWithProjects.map((team) => (
            <Button
              key={team.id}
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-lg hover:bg-primary/10"
              title={team.name}
              onClick={() => toggleCollapsed()}
            >
              <Users className="h-4 w-4 text-muted-foreground" />
            </Button>
          ))}
        </div>

        {/* Bottom icons */}
        <div className="border-t border-border/40 py-3 flex flex-col gap-1 items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-primary/10"
            title={t('sidebar.apiKeys')}
            asChild
          >
            <Link href="/settings/api-keys">
              <Key className="h-4 w-4 text-muted-foreground" />
            </Link>
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 rounded-lg hover:bg-primary/10"
            title={t('sidebar.expand')}
            onClick={toggleCollapsed}
          >
            <PanelLeft className="h-4 w-4 text-muted-foreground" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full w-[240px] border-r border-border/50 bg-background/95 flex-shrink-0 transition-all duration-200">
      {/* Logo row */}
      <div className="flex items-center gap-2 h-16 px-4 border-b border-border/40">
        <Logo className="h-6 w-6 flex-shrink-0" />
        <span className="font-semibold text-base truncate">{t('header.title')}</span>
      </div>

      {/* Teams + Projects */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {!loading && teamsWithProjects.length === 0 && (
          <p className="text-xs text-muted-foreground px-4 py-3">{t('sidebar.noTeams')}</p>
        )}

        {!loading &&
          teamsWithProjects.map((team) => (
            <div key={team.id} className="mb-1">
              {/* Team row */}
              <button
                onClick={() => toggleTeam(team.id)}
                className="w-full flex items-center gap-2 px-3 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md mx-1 transition-colors"
                style={{ width: 'calc(100% - 8px)' }}
              >
                {team.expanded ? (
                  <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                ) : (
                  <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                )}
                <Users className="h-3.5 w-3.5 flex-shrink-0" />
                <span className="truncate font-medium text-xs uppercase tracking-wide">
                  {team.name}
                </span>
              </button>

              {/* Projects */}
              {team.expanded && (
                <div className="ml-5 mr-1">
                  {!team.projectsLoaded && (
                    <div className="flex items-center gap-2 px-3 py-1.5 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                    </div>
                  )}

                  {team.projectsLoaded && (!team.projects || team.projects.length === 0) && (
                    <p className="text-xs text-muted-foreground px-3 py-1.5">
                      {t('sidebar.noProjects')}
                    </p>
                  )}

                  {team.projects?.map((project) => {
                    const isActive = project.id === currentProjectId;
                    return (
                      <button
                        key={project.id}
                        onClick={() => handleProjectClick(project, team)}
                        className={`w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${
                          isActive
                            ? 'bg-primary/10 text-primary font-medium'
                            : 'text-muted-foreground hover:text-foreground hover:bg-muted/50'
                        }`}
                      >
                        <Folder className={`h-3.5 w-3.5 flex-shrink-0 ${isActive ? 'text-primary' : ''}`} />
                        <span className="truncate">{project.name}</span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          ))}
      </div>

      {/* Bottom */}
      <div className="border-t border-border/40 px-2 py-2 flex flex-col gap-0.5">
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-8 px-3 text-muted-foreground hover:text-foreground"
          asChild
        >
          <Link href="/settings/api-keys">
            <Key className="h-3.5 w-3.5" />
            <span className="text-sm">{t('sidebar.apiKeys')}</span>
          </Link>
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start gap-2 h-8 px-3 text-muted-foreground hover:text-foreground"
          onClick={toggleCollapsed}
          title={t('sidebar.collapse')}
        >
          <PanelLeftClose className="h-3.5 w-3.5" />
          <span className="text-sm">{t('sidebar.collapse')}</span>
        </Button>
      </div>
    </div>
  );
}
