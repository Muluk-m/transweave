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
import { getProjectRecentActivities } from "@/api/project";
import { formatDistanceToNow } from "date-fns";
import { zhCN } from "date-fns/locale";

interface ProjectOverviewTabProps {
  project: Project | null;
}

export function ProjectOverviewTab({ project }: ProjectOverviewTabProps) {
  const t = useTranslations("project.overview");
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);

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

  // Get activity icon and color based on type
  const getActivityIcon = (type: ActivityType) => {
    const iconClass = "h-5 w-5";
    switch (type) {
      case ActivityType.PROJECT_CREATE:
      case ActivityType.TOKEN_CREATE:
        return {
          icon: <Plus className={iconClass} />,
          colorClass: "bg-green-100 text-green-600",
        };
      case ActivityType.PROJECT_UPDATE:
      case ActivityType.TOKEN_UPDATE:
        return {
          icon: <Edit className={iconClass} />,
          colorClass: "bg-blue-100 text-blue-600",
        };
      case ActivityType.PROJECT_DELETE:
      case ActivityType.TOKEN_DELETE:
        return {
          icon: <Trash className={iconClass} />,
          colorClass: "bg-red-100 text-red-600",
        };
      case ActivityType.PROJECT_LANGUAGE_ADD:
      case ActivityType.PROJECT_LANGUAGE_REMOVE:
        return {
          icon: <Languages className={iconClass} />,
          colorClass: "bg-purple-100 text-purple-600",
        };
      case ActivityType.PROJECT_EXPORT:
        return {
          icon: <Download className={iconClass} />,
          colorClass: "bg-indigo-100 text-indigo-600",
        };
      case ActivityType.PROJECT_IMPORT:
        return {
          icon: <Upload className={iconClass} />,
          colorClass: "bg-yellow-100 text-yellow-600",
        };
      default:
        return {
          icon: <FileText className={iconClass} />,
          colorClass: "bg-gray-100 text-gray-600",
        };
    }
  };

  // Get activity description
  const getActivityDescription = (activity: ActivityLog) => {
    const user = typeof activity.userId === "object" ? activity.userId : null;
    const userName = user?.name || t("unknownUser");
    const entityName = activity.details.entityName || "";

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
          language: activity.details.language,
        });
      case ActivityType.PROJECT_LANGUAGE_REMOVE:
        return t("activityLanguageRemoved", {
          user: userName,
          language: activity.details.language,
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
          format: activity.details.format,
        });
      case ActivityType.PROJECT_IMPORT:
        return t("activityProjectImported", {
          user: userName,
          language: activity.details.language,
          count: activity.details.stats?.added || 0,
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

    // Calculate translation progress
    let totalTranslations = 0;
    let completedTranslations = 0;

    tokens.forEach((token) => {
      const expectedTranslations = languages.length;
      totalTranslations += expectedTranslations;
      completedTranslations += Object.keys(token.translations || {}).length;
    });

    const completionRate =
      totalTranslations > 0
        ? Math.round((completedTranslations / totalTranslations) * 100)
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

    return {
      totalTokens: tokens.length,
      languages,
      completionRate,
      tags: Array.from(allTags),
      lastUpdated,
      teamMembers,
      modules,
      moduleStats,
      tokensWithoutModule,
    };
  }, [project, t]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{project?.name}</h1>
          <p className="text-gray-600">
            {project?.description || t("noDescription")}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("documentCount")}
            </CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.totalTokens}</div>
            <p className="text-xs text-muted-foreground">
              {t("documentCountDesc")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("supportedLanguages")}
            </CardTitle>
            <Globe className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectStats.languages.length}
            </div>
            <p className="text-xs text-muted-foreground">
              {projectStats.languages.join(", ")}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("translationProgress")}
            </CardTitle>
            <Percent className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {projectStats.completionRate}%
            </div>
            <Progress className="mt-2" value={projectStats.completionRate} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              {t("teamMembers")}
            </CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{projectStats.teamMembers}</div>
            <p className="text-xs text-muted-foreground">
              {t("teamMembersDesc")}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
        <Card>
          <CardHeader>
            <CardTitle>{t("recentActivity")}</CardTitle>
            <CardDescription>{t("recentActivityDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {loading ? (
              <div className="text-sm text-muted-foreground">
                {t("loadingActivities")}
              </div>
            ) : activities.length === 0 ? (
              <div className="text-sm text-muted-foreground">
                {t("noRecentActivities")}
              </div>
            ) : (
              activities.map((activity, index) => (
                <div key={index} className="flex items-center">
                  <div
                    className={`mr-4 rounded-full h-10 w-10 ${
                      getActivityIcon(activity.type).colorClass
                    } flex items-center justify-center`}
                  >
                    {getActivityIcon(activity.type).icon}
                  </div>
                  <div className="flex-1">
                    <p className="text-sm font-medium">
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

        <Card>
          <CardHeader>
            <CardTitle>{t("projectInfo")}</CardTitle>
            <CardDescription>{t("projectInfoDesc")}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Clock className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-sm">{t("lastUpdated")}</span>
              </div>
              <span className="text-sm font-medium">
                {projectStats.lastUpdated}
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <TagIcon className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-sm">{t("tagCount")}</span>
              </div>
              <span className="text-sm font-medium">
                {projectStats.tags.length}
              </span>
            </div>
            <div>
              <div className="flex items-center mb-2">
                <TagIcon className="h-4 w-4 text-muted-foreground mr-2" />
                <span className="text-sm">{t("commonTags")}</span>
              </div>
              <div className="flex flex-wrap gap-2">
                {projectStats.tags.slice(0, 5).map((tag, index) => (
                  <span
                    key={index}
                    className="bg-gray-200 text-gray-700 px-2 py-1 rounded-lg text-xs"
                  >
                    {tag}
                  </span>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Module Statistics */}
      {Array.isArray(projectStats.modules) && projectStats.modules.length > 0 && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5" />
              模块统计
            </CardTitle>
            <CardDescription>
              按功能模块划分的词条分布情况
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {Array.from(projectStats.moduleStats.values()).map((moduleData) => {
                const percentage = projectStats.totalTokens > 0
                  ? Math.round((moduleData.count / projectStats.totalTokens) * 100)
                  : 0;

                return (
                  <div key={moduleData.code} className="space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-blue-500" />
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium">{moduleData.name}</span>
                          <code className="bg-blue-50 text-blue-700 px-2 py-0.5 rounded text-xs">
                            {moduleData.code}
                          </code>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{moduleData.count} 个词条</span>
                        <span className="text-xs text-muted-foreground">
                          ({percentage}%)
                        </span>
                      </div>
                    </div>
                    <Progress value={percentage} className="h-2" />
                  </div>
                );
              })}
              {projectStats.tokensWithoutModule > 0 && (
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <Package className="h-4 w-4 text-gray-400" />
                      <span className="text-sm text-gray-500">无模块</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">
                        {projectStats.tokensWithoutModule} 个词条
                      </span>
                      <span className="text-xs text-muted-foreground">
                        ({Math.round((projectStats.tokensWithoutModule / projectStats.totalTokens) * 100)}%)
                      </span>
                    </div>
                  </div>
                  <Progress 
                    value={Math.round((projectStats.tokensWithoutModule / projectStats.totalTokens) * 100)} 
                    className="h-2" 
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
