"use client";
import { useState, useEffect } from "react";
import { Project, ActivityLog, ActivityType } from "@/jotai/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Clock,
  User,
  Plus,
  Edit,
  Trash,
  Languages,
  Download,
  Upload,
  FileText,
  ChevronLeft,
  ChevronRight,
  Filter,
} from "lucide-react";
import { useTranslations } from "next-intl";
import { queryProjectActivities } from "@/api/project";
import { formatDistanceToNow } from "date-fns";
import { zhCN, enUS } from "date-fns/locale";
import { useParams } from "next/navigation";
import { useToast } from "@/components/ui/use-toast";
import { Avatar, AvatarImage } from "@/components/ui/avatar";

interface ProjectActivityTabProps {
  project: Project | null;
}

export function ProjectActivityTab({ project }: ProjectActivityTabProps) {
  const t = useTranslations("project.activity");
  const params = useParams();
  const locale = params.locale as string;

  const { toast } = useToast();
  const [activities, setActivities] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(false);
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 0,
  });

  // Filters
  const [filterType, setFilterType] = useState<string>("all");
  const [filterDateRange, setFilterDateRange] = useState<string>("all");
  const [customStartDate, setCustomStartDate] = useState<string>("");
  const [customEndDate, setCustomEndDate] = useState<string>("");

  // Fetch activities
  const fetchActivities = async (page = 1) => {
    if (!project?.id) return;

    setLoading(true);
    try {
      const params: any = {
        projectId: project.id,
        page,
        limit: pagination.limit,
      };

      // Add type filter
      if (filterType !== "all") {
        params.type = filterType;
      }

      // Add date filter
      if (filterDateRange === "today") {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        params.startDate = today.toISOString();
      } else if (filterDateRange === "week") {
        const weekAgo = new Date();
        weekAgo.setDate(weekAgo.getDate() - 7);
        params.startDate = weekAgo.toISOString();
      } else if (filterDateRange === "month") {
        const monthAgo = new Date();
        monthAgo.setMonth(monthAgo.getMonth() - 1);
        params.startDate = monthAgo.toISOString();
      } else if (
        filterDateRange === "custom" &&
        customStartDate &&
        customEndDate
      ) {
        params.startDate = new Date(customStartDate).toISOString();
        params.endDate = new Date(customEndDate).toISOString();
      }

      const result = await queryProjectActivities(params);
      setActivities(result.data);
      setPagination(result.pagination);
    } catch (error) {
      console.error("Failed to fetch activities:", error);
      toast({
        title: t("fetchError"),
        description: t("fetchErrorDesc"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Initial fetch and refetch on filter changes
  useEffect(() => {
    fetchActivities(1);
  }, [
    project?.id,
    filterType,
    filterDateRange,
    customStartDate,
    customEndDate,
  ]);

  // Get activity icon
  const getActivityIcon = (type: ActivityType) => {
    const iconClass = "h-4 w-4 text-grey-200";
    switch (type) {
      case ActivityType.PROJECT_CREATE:
      case ActivityType.TOKEN_CREATE:
        return <Plus className={iconClass} />;
      case ActivityType.PROJECT_UPDATE:
      case ActivityType.TOKEN_UPDATE:
        return <Edit className={iconClass} />;
      case ActivityType.PROJECT_DELETE:
      case ActivityType.TOKEN_DELETE:
        return <Trash className={iconClass} />;
      case ActivityType.PROJECT_LANGUAGE_ADD:
      case ActivityType.PROJECT_LANGUAGE_REMOVE:
        return <Languages className={iconClass} />;
      case ActivityType.PROJECT_EXPORT:
        return <Download className={iconClass} />;
      case ActivityType.PROJECT_IMPORT:
        return <Upload className={iconClass} />;
      default:
        return <FileText className={iconClass} />;
    }
  };

  // Get activity type label
  const getActivityTypeLabel = (type: ActivityType) => {
    switch (type) {
      case ActivityType.PROJECT_CREATE:
        return t("typeProjectCreate");
      case ActivityType.PROJECT_UPDATE:
        return t("typeProjectUpdate");
      case ActivityType.PROJECT_DELETE:
        return t("typeProjectDelete");
      case ActivityType.PROJECT_LANGUAGE_ADD:
        return t("typeLanguageAdd");
      case ActivityType.PROJECT_LANGUAGE_REMOVE:
        return t("typeLanguageRemove");
      case ActivityType.TOKEN_CREATE:
        return t("typeTokenCreate");
      case ActivityType.TOKEN_UPDATE:
        return t("typeTokenUpdate");
      case ActivityType.TOKEN_DELETE:
        return t("typeTokenDelete");
      case ActivityType.PROJECT_EXPORT:
        return t("typeProjectExport");
      case ActivityType.PROJECT_IMPORT:
        return t("typeProjectImport");
      default:
        return type;
    }
  };

  // Get activity description
  const getActivityDescription = (activity: ActivityLog) => {
    const {
      entityName = "",
      stats,
      changes,
      language,
      format,
    } = activity.details ?? {};

    // Build description based on activity type
    let description = "";
    switch (activity.type) {
      case ActivityType.TOKEN_CREATE:
      case ActivityType.TOKEN_UPDATE:
      case ActivityType.TOKEN_DELETE:
        // 具体的操作
        description = `${t("token")}: ${entityName}`;
        break;
      case ActivityType.PROJECT_LANGUAGE_ADD:
      case ActivityType.PROJECT_LANGUAGE_REMOVE:
        description = `${t("language")}: ${language}`;
        break;
      case ActivityType.PROJECT_EXPORT:
        description = `${t("format")}: ${format}`;
        break;
      case ActivityType.PROJECT_IMPORT:
        description = `${t("language")}: ${language}, ${t("imported")}: ${
          stats?.added || 0
        }, ${t("updated")}: ${stats?.updated || 0}`;
        break;
      case ActivityType.PROJECT_UPDATE:
        if (changes && changes.length > 0) {
          description = `${t("changedFields")}`;
        }
        break;
    }

    return description;
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

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>{t("title")}</CardTitle>
              <CardDescription>{t("description")}</CardDescription>
            </div>
            <Filter className="h-5 w-5 text-muted-foreground" />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Activity Type Filter */}
            <div className="space-y-2">
              <Label>{t("filterType")}</Label>
              <Select value={filterType} onValueChange={setFilterType}>
                <SelectTrigger>
                  <SelectValue placeholder={t("selectType")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTypes")}</SelectItem>
                  <SelectItem value={ActivityType.PROJECT_CREATE}>
                    {getActivityTypeLabel(ActivityType.PROJECT_CREATE)}
                  </SelectItem>
                  <SelectItem value={ActivityType.PROJECT_UPDATE}>
                    {getActivityTypeLabel(ActivityType.PROJECT_UPDATE)}
                  </SelectItem>
                  <SelectItem value={ActivityType.PROJECT_DELETE}>
                    {getActivityTypeLabel(ActivityType.PROJECT_DELETE)}
                  </SelectItem>
                  <SelectItem value={ActivityType.TOKEN_CREATE}>
                    {getActivityTypeLabel(ActivityType.TOKEN_CREATE)}
                  </SelectItem>
                  <SelectItem value={ActivityType.TOKEN_UPDATE}>
                    {getActivityTypeLabel(ActivityType.TOKEN_UPDATE)}
                  </SelectItem>
                  <SelectItem value={ActivityType.TOKEN_DELETE}>
                    {getActivityTypeLabel(ActivityType.TOKEN_DELETE)}
                  </SelectItem>
                  <SelectItem value={ActivityType.PROJECT_EXPORT}>
                    {getActivityTypeLabel(ActivityType.PROJECT_EXPORT)}
                  </SelectItem>
                  <SelectItem value={ActivityType.PROJECT_IMPORT}>
                    {getActivityTypeLabel(ActivityType.PROJECT_IMPORT)}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Date Range Filter */}
            <div className="space-y-2">
              <Label>{t("filterDate")}</Label>
              <Select
                value={filterDateRange}
                onValueChange={setFilterDateRange}
              >
                <SelectTrigger>
                  <SelectValue placeholder={t("selectDateRange")} />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">{t("allTime")}</SelectItem>
                  <SelectItem value="today">{t("today")}</SelectItem>
                  <SelectItem value="week">{t("lastWeek")}</SelectItem>
                  <SelectItem value="month">{t("lastMonth")}</SelectItem>
                  <SelectItem value="custom">{t("customRange")}</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Custom Date Range */}
            {filterDateRange === "custom" && (
              <div className="space-y-2 md:col-span-1">
                <Label>{t("dateRange")}</Label>
                <div className="flex gap-2">
                  <Input
                    type="date"
                    value={customStartDate}
                    onChange={(e) => setCustomStartDate(e.target.value)}
                    placeholder={t("startDate")}
                  />
                  <Input
                    type="date"
                    value={customEndDate}
                    onChange={(e) => setCustomEndDate(e.target.value)}
                    placeholder={t("endDate")}
                  />
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Activity List */}
      <Card>
        <CardContent className="p-0">
          <ScrollArea className="h-[450px]">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{t("time")}</TableHead>
                  <TableHead className="w-[150px]">{t("user")}</TableHead>
                  <TableHead className="w-[150px]">{t("type")}</TableHead>
                  <TableHead>{t("details")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      {t("loading")}
                    </TableCell>
                  </TableRow>
                ) : activities.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8">
                      {t("noActivities")}
                    </TableCell>
                  </TableRow>
                ) : (
                  activities.map((activity, index) => {
                    const user =
                      typeof activity.userId === "object"
                        ? activity.userId
                        : null;
                    return (
                      <TableRow key={index}>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <span className="text-sm">
                              {formatTime(activity.createdAt)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <Avatar className="h-5 w-5">
                              <AvatarImage src={user?.avatar} />
                            </Avatar>
                            <span className="text-sm">
                              {user?.name || t("unknownUser")}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <div className="flex items-center gap-2">
                            {getActivityIcon(activity.type)}
                            <span className="text-sm">
                              {getActivityTypeLabel(activity.type)}
                            </span>
                          </div>
                        </TableCell>
                        <TableCell>
                          <span className="text-sm text-muted-foreground">
                            {getActivityDescription(activity)}
                          </span>
                        </TableCell>
                      </TableRow>
                    );
                  })
                )}
              </TableBody>
            </Table>
          </ScrollArea>
        </CardContent>

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <div className="p-4 border-t">
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">
                {t("showing", {
                  from: (pagination.page - 1) * pagination.limit + 1,
                  to: Math.min(
                    pagination.page * pagination.limit,
                    pagination.total
                  ),
                  total: pagination.total,
                })}
              </p>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchActivities(pagination.page - 1)}
                  disabled={pagination.page === 1}
                >
                  <ChevronLeft className="h-4 w-4" />
                  {t("previous")}
                </Button>
                <span className="text-sm">
                  {t("pageInfo", {
                    current: pagination.page,
                    total: pagination.totalPages,
                  })}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => fetchActivities(pagination.page + 1)}
                  disabled={pagination.page === pagination.totalPages}
                >
                  {t("next")}
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
