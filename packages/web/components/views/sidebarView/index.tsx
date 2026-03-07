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
  Plus,
  BookOpen,
  PanelLeftClose,
  PanelLeft,
  Loader2,
} from 'lucide-react';
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

  // Sync teamsWithProjects from teamsAtom
  useEffect(() => {
    if (teams.length > 0) {
      setTeamsWithProjects((prev) => {
        const prevMap = new Map(prev.map((t) => [t.id, t]));
        return teams.map((team) => {
          const existing = prevMap.get(team.id);
          if (existing) return { ...existing, ...team };
          return { ...team, expanded: true, projects: undefined, projectsLoaded: false };
        });
      });
      setLoading(false);
    }
  }, [teams]);

  // Fallback: fetch teams if atom is empty (e.g. direct navigation to /project/xxx)
  useEffect(() => {
    if (teams.length === 0) {
      const fallback = async () => {
        try {
          const data = await fetchMyTeams();
          if (data.length > 0) setTeams(data);
        } finally {
          setLoading(false);
        }
      };
      fallback();
    }
  }, []);

  // Load projects for new teams that don't have projects loaded yet
  useEffect(() => {
    teamsWithProjects.forEach((team) => {
      if (team.expanded && !team.projectsLoaded) {
        loadProjects(team.id);
      }
    });
  }, [teamsWithProjects, loadProjects]);

  const handleProjectClick = (project: Project, team: Team) => {
    setNowTeam(team);
    router.push(`/project/${project.id}`);
  };

  if (collapsed) {
    return (
      <div className="flex flex-col h-full w-[52px] border-r border-border bg-background/95 flex-shrink-0 transition-all duration-200">
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
            title={t('sidebar.tutorial')}
            asChild
          >
            <Link href="/tutorial">
              <BookOpen className="h-4 w-4 text-muted-foreground" />
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
    <div className="flex flex-col h-full w-[240px] border-r border-border bg-background/95 flex-shrink-0 transition-all duration-200">
      {/* Teams + Projects */}
      <div className="flex-1 overflow-y-auto py-2">
        {loading && (
          <div className="flex items-center justify-center py-8 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
          </div>
        )}

        {!loading && teamsWithProjects.length === 0 && (
          <div className="px-3 py-3 space-y-2">
            <p className="text-xs text-muted-foreground px-1">{t('sidebar.noTeams')}</p>
            <Button
              variant="outline"
              size="sm"
              className="w-full justify-start gap-2 h-8 text-xs"
              onClick={() => router.push('/')}
            >
              <Plus className="h-3.5 w-3.5" />
              {t('sidebar.createTeam')}
            </Button>
          </div>
        )}

        {!loading &&
          teamsWithProjects.map((team) => (
            <div key={team.id} className="mb-1">
              {/* Team row */}
              <div className="flex items-center mx-1" style={{ width: 'calc(100% - 8px)' }}>
                <button
                  onClick={() => toggleTeam(team.id)}
                  className="flex items-center gap-1 px-2 py-1.5 text-muted-foreground hover:text-foreground transition-colors"
                >
                  {team.expanded ? (
                    <ChevronDown className="h-3.5 w-3.5 flex-shrink-0" />
                  ) : (
                    <ChevronRight className="h-3.5 w-3.5 flex-shrink-0" />
                  )}
                </button>
                <button
                  onClick={() => {
                    setNowTeam(team);
                    toggleTeam(team.id);
                  }}
                  className="flex-1 flex items-center gap-2 px-1 py-1.5 text-sm text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-md transition-colors truncate"
                >
                  <Users className="h-3.5 w-3.5 flex-shrink-0" />
                  <span className="truncate font-medium text-xs uppercase tracking-wide">
                    {team.name}
                  </span>
                </button>
              </div>

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

                  {/* New project shortcut */}
                  {team.projectsLoaded && (
                    <button
                      onClick={() => {
                        setNowTeam(team);
                        router.push('/');
                      }}
                      className="w-full flex items-center gap-2 px-3 py-1.5 rounded-md text-xs text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/50 transition-colors"
                    >
                      <Plus className="h-3 w-3 flex-shrink-0" />
                      <span className="truncate">{t('sidebar.newProject')}</span>
                    </button>
                  )}
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
          asChild
        >
          <Link href="/tutorial">
            <BookOpen className="h-3.5 w-3.5" />
            <span className="text-sm">{t('sidebar.tutorial')}</span>
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
