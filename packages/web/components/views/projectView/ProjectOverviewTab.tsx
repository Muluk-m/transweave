"use client";
import { useMemo, useEffect, useState } from "react";
import { Project, ActivityLog, ActivityType } from "@/jotai/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Clock,
  FileText,
  Globe,
  Percent,
  TagIcon,
  Users,
  Plus,
  Edit,
  Trash,
  Languages,
  Download,
  Upload,
  Package,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { getProjectRecentActivities, getTokenProgress } from "@/api/project";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";
import { formatLanguageDisplay } from "@/constants";

interface ProjectOverviewTabProps {
  project: Project | null;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const t = useTranslations("project.overview");
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [languageProgress, setLanguageProgress] = useState<Array<{
    language: string;
    total: number;
    completed: number;
    percentage: number;
  }>>([]);

  // Fetch recent activities
  useEffect(() => {
    if (project?.id) {
      setLoading(true);
      getProjectRecentActivities(project.id, 5)
        .then((data) => {
          setActivities(data);
        })
        .catch((err) => {
          console.error("Failed to fetch activities:", err);
        })
        .finally(() => {
          setLoading(false);
        });
    }
  }, [project?.id]);

  // Fetch per-language completion progress from server
  useEffect(() => {
    if (project?.id) {
      getTokenProgress(project.id)
        .then((data) => {
          setLanguageProgress(data);
        })
        .catch((err) => {
          console.error("Failed to fetch token progress:", err);
        });
    }
  }, [project?.id]);

  // Get activity icon and color based on type
  const getActivityIcon = (type: ActivityType) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case ActivityType.PROJECT_CREATE:
      case ActivityType.TOKEN_CREATE:
        return {
          icon: <Plus className={iconClass} />,
          colorClass: "bg-green-500/15 text-green-500",
        };
      case ActivityType.PROJECT_UPDATE:
      case ActivityType.TOKEN_UPDATE:
        return {
          icon: <Edit className={iconClass} />,
          colorClass: "bg-blue-500/15 text-blue-500",
        };
      case ActivityType.PROJECT_DELETE:
      case ActivityType.TOKEN_DELETE:
        return {
          icon: <Trash className={iconClass} />,
          colorClass: "bg-red-500/15 text-red-500",
        };
      case ActivityType.PROJECT_LANGUAGE_ADD:
      case ActivityType.PROJECT_LANGUAGE_REMOVE:
        return {
          icon: <Languages className={iconClass} />,
          colorClass: "bg-purple-500/15 text-purple-500",
        };
      case ActivityType.PROJECT_EXPORT:
        return {
          icon: <Download className={iconClass} />,
          colorClass: "bg-indigo-500/15 text-indigo-500",
        };
      case ActivityType.PROJECT_IMPORT:
        return {
          icon: <Upload className={iconClass} />,
          colorClass: "bg-yellow-500/15 text-yellow-500",
        };
      default:
        return {
          icon: <FileText className={iconClass} />,
          colorClass: "bg-muted text-muted-foreground",
        };
    }
  };

  // Get activity description
  const getActivityDescription = (activity: ActivityLog & { _user?: { name: string } | null }) => {
    const userName = activity._user?.name || t("unknownUser");
    const entityName = activity.details?.entityName || "";

    switch (activity.type) {
      case ActivityType.PROJECT_CREATE:
        return t("activityProjectCreated", { user: userName });
      case ActivityType.PROJECT_UPDATE:
        return t("activityProjectUpdated", { user: userName });
      case ActivityType.PROJECT_DELETE:
        return t("activityProjectDeleted", { user: userName });
      case ActivityType.PROJECT_LANGUAGE_ADD:
        return t("activityLanguageAdded", {
          user: userName,
          language: activity.details?.language,
        });
      case ActivityType.PROJECT_LANGUAGE_REMOVE:
        return t("activityLanguageRemoved", {
          user: userName,
          language: activity.details?.language,
        });
      case ActivityType.TOKEN_CREATE:
        return t("activityTokenCreated", {
          user: userName,
          token: entityName,
        });
      case ActivityType.TOKEN_UPDATE:
        return t("activityTokenUpdated", {
          user: userName,
          token: entityName,
        });
      case ActivityType.TOKEN_DELETE:
        return t("activityTokenDeleted", {
          user: userName,
          token: entityName,
        });
      case ActivityType.PROJECT_EXPORT:
        return t("activityProjectExported", {
          user: userName,
          format: activity.details?.format,
        });
      case ActivityType.PROJECT_IMPORT:
        return t("activityProjectImported", {
          user: userName,
          language: activity.details?.language,
          count: activity.details?.stats?.added || 0,
        });
      default:
        return t("activityUnknown", { user: userName });
    }
  };

  // Format time
  const formatTime = (dateString: string) => {
    try {
      const date = new Date(dateString);
      return formatDistanceToNow(date, {
        addSuffix: true,
        locale: zhCN,
      });
    } catch (error) {
      return "";
    }
  };

  // Calculate project statistics
  const projectStats: {
    totalTokens: number;
    languages: string[];
    completionRate: number;
    tags: string[];
    lastUpdated: string;
    teamMembers: number;
    modules: { name: string; code: string }[];
    moduleStats: Map<string, { name: string; code: string; count: number }>;
    tokensWithoutModule: number;
  } = useMemo(() => {
    if (!project)
      return {
        totalTokens: 0,
        languages: [] as string[],
        completionRate: 0,
        tags: [] as string[],
        lastUpdated: t("today"),
        teamMembers: 0,
        modules: [] as { name: string; code: string }[],
        moduleStats: new Map<string, { name: string; code: string; count: number }>(),
        tokensWithoutModule: 0,
      };

    const tokens = project.tokens || [];
    const languages = project.languages || [];

    // Derive completion rate from server-side language progress
    const totalCompleted = languageProgress.reduce((sum, lp) => sum + lp.completed, 0);
    const totalExpected = languageProgress.reduce((sum, lp) => sum + lp.total, 0);
    const completionRate = totalExpected > 0
      ? Math.round((totalCompleted / totalExpected) * 100)
      : 0;

    // Collect all tags
    const allTags = new Set<string>();
    tokens.forEach((token) => {
      token.tags.forEach((tag) => allTags.add(tag));
    });

    // Get team member count
    const teamMembers = project.memberships?.length || 0;

    // Mock last updated time
    const lastUpdated = t("today");

    // Calculate module statistics
    const modules = project.modules || [];
    const moduleStats = new Map<string, { name: string; code: string; count: number }>();
    let tokensWithoutModule = 0;
    
    tokens.forEach((token) => {
      if (token.module) {
        const moduleInfo = modules.find(m => m.code === token.module);
        const current = moduleStats.get(token.module);
        moduleStats.set(token.module, {
          name: moduleInfo?.name || token.module,
          code: token.module,
          count: (current?.count || 0) + 1
        });
      } else {
        tokensWithoutModule++;
      }
    });

    // Use server-side token count if available, fall back to local tokens
    const totalTokens = languageProgress.length > 0
      ? languageProgress[0].total
      : tokens.length;

    return {
      totalTokens,
      languages,
      completionRate,
      tags: Array.from(allTags),
      lastUpdated,
      teamMembers,
      modules,
      moduleStats,
      tokensWithoutModule,
    };
  }, [project, t, languageProgress]);

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-border/50 hover:shadow-soft hover:border-primary/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("documentCount")}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10">
              <FileText className="h-4 w-4 text-primary" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{projectStats.totalTokens}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("documentCountDesc")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-soft hover:border-primary/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("supportedLanguages")}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-accent/10">
              <Globe className="h-4 w-4 text-accent" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {projectStats.languages.length}
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              {projectStats.languages
                .map((lang) => formatLanguageDisplay(lang, project?.languageLabels))
                .join(", ")}
            </p>
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-soft hover:border-primary/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("translationProgress")}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-success/10">
              <Percent className="h-4 w-4 text-success" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">
              {projectStats.completionRate}%
            </div>
            <Progress className="mt-2 h-2" value={projectStats.completionRate} />
          </CardContent>
        </Card>

        <Card className="border-border/50 hover:shadow-soft hover:border-primary/20 transition-all duration-300">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              {t("teamMembers")}
            </CardTitle>
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-warning/10">
              <Users className="h-4 w-4 text-warning" />
            </div>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{projectStats.teamMembers}</div>
            <p className="text-xs text-muted-foreground mt-1">
              {t("teamMembersDesc")}
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Activity and Info Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">{t("recentActivity")}</CardTitle>
            <CardDescription>{t("recentActivityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {loading ? (
              <div className="space-y-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="flex items-center gap-4">
                    <div className="h-10 w-10 rounded-xl bg-muted animate-pulse" />
                    <div className="flex-1 space-y-2">
                      <div className="h-4 w-3/4 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-1/4 bg-muted animate-pulse rounded" />
                    </div>
                  </div>
                ))}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-center py-8">
                <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-muted/50 mx-auto mb-3">
                  <Clock className="h-6 w-6 text-muted-foreground" />
                </div>
                <p className="text-sm text-muted-foreground">
                  {t("noRecentActivities")}
                </p>
              </div>
            ) : (
              activities.map((activity, index) => (
                <div 
                  key={index} 
                  className="flex items-center gap-4 p-2 rounded-lg hover:bg-muted/50 transition-colors"
                >
                  <div
                    className={`rounded-xl h-10 w-10 ${
                      getActivityIcon(activity.type).colorClass
                    } flex items-center justify-center flex-shrink-0`}
                  >
                    {getActivityIcon(activity.type).icon}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {getActivityDescription(activity)}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {formatTime(activity.createdAt)}
                    </p>
                  </div>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50">
          <CardHeader>
            <CardTitle className="text-lg">{t("projectInfo")}</CardTitle>
            <CardDescription>{t("projectInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("lastUpdated")}</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {projectStats.lastUpdated}
              </span>
            </div>
            <div className="flex items-center justify-between p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("tagCount")}</span>
              </div>
              <span className="text-sm font-medium text-foreground">
                {projectStats.tags.length}
              </span>
            </div>
            <div className="p-3 rounded-lg bg-muted/30">
              <div className="flex items-center gap-2 mb-3">
                <TagIcon className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">{t("commonTags")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectStats.tags.length > 0 ? (
                  projectStats.tags.slice(0, 5).map((tag, index) => (
                    <span
                      key={index}
                      className="bg-primary/10 text-primary px-2.5 py-1 rounded-lg text-xs font-medium"
                    >
                      {tag}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-muted-foreground">{t("noTags")}</span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Per-Language Translation Progress */}
      {languageProgress.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-accent/10 to-primary/10">
                <Globe className="h-5 w-5 text-accent" />
              </div>
              <div>
                <CardTitle className="text-lg">{t("translationProgress")}</CardTitle>
                <CardDescription>
                  {t("supportedLanguages")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {languageProgress.map((lp) => (
                <div key={lp.language} className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">
                      {formatLanguageDisplay(lp.language, project?.languageLabels)}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Progress value={lp.percentage} className="h-2 w-32" />
                    <span className="text-sm text-muted-foreground">{lp.percentage}%</span>
                    <span className="text-xs text-muted-foreground">({lp.completed}/{lp.total})</span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Module Statistics */}
      {Array.isArray(projectStats.modules) && projectStats.modules.length > 0 && (
        <Card className="border-border/50">
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary/10 to-accent/10">
                <Package className="h-5 w-5 text-primary" />
              </div>
              <div>
                <CardTitle className="text-lg">{t("moduleStats")}</CardTitle>
                <CardDescription>
                  {t("moduleStatsDesc")}
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(projectStats.moduleStats.values()).map((moduleData, index) => {
                const percentage = projectStats.totalTokens > 0
                  ? Math.round((moduleData.count / projectStats.totalTokens) * 100)
                  : 0;

                return (
                  <div 
                    key={moduleData.code} 
                    className="p-3 rounded-lg bg-muted/30 hover:bg-muted/50 transition-colors"
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10">
                          <Package className="h-4 w-4 text-primary" />
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-foreground">{moduleData.name}</span>
                          <code className="bg-primary/10 text-primary px-2 py-0.5 rounded-md text-xs font-mono">
                            {moduleData.code}
                          </code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{moduleData.count}</span>
                        <span className="text-xs text-muted-foreground">
                          ({percentage}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-1.5" />
                  </div>
                );
              })}
              {projectStats.tokensWithoutModule > 0 && (
                <div className="p-3 rounded-lg bg-muted/30">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-muted">
                        <Package className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <span className="text-sm text-muted-foreground">{t("uncategorized")}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {projectStats.tokensWithoutModule}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.round((projectStats.tokensWithoutModule / projectStats.totalTokens) * 100)}%)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={Math.round((projectStats.tokensWithoutModule / projectStats.totalTokens) * 100)} 
                    className="h-1.5" 
                  />
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
