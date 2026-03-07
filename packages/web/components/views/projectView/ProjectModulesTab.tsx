"use client";

import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { nowProjectAtom } from "@/jotai";
import type { ProjectModule } from "@/jotai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Package } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addModule, removeModule, getModuleStats } from "@/api/project";

export function ProjectModulesTab() {
  const [project, setProject] = useAtom(nowProjectAtom);
  const { toast } = useToast();
  const t = useTranslations("modules");
  const [newModuleName, setNewModuleName] = useState("");
  const [newModuleCode, setNewModuleCode] = useState("");
  const [moduleError, setModuleError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [moduleTokenCounts, setModuleTokenCounts] = useState<Record<string, number>>({});

  const modules: ProjectModule[] = project?.modules || [];

  // Fetch module token counts from backend
  const fetchModuleStats = useCallback(async () => {
    if (!project?.id) return;
    try {
      const stats = await getModuleStats(project.id);
      const counts: Record<string, number> = {};
      for (const stat of stats) {
        if (stat.module) {
          counts[stat.module] = stat.count;
        }
      }
      setModuleTokenCounts(counts);
    } catch {
      // Silently fail - counts will show 0
    }
  }, [project?.id]);

  useEffect(() => {
    fetchModuleStats();
  }, [fetchModuleStats]);

  const getModuleTokenCount = (moduleCode: string) => {
    return moduleTokenCounts[moduleCode] || 0;
  };

  // 添加模块
  const handleAddModule = async () => {
    setModuleError("");

    if (!newModuleName || !newModuleCode) {
      setModuleError(t("nameCodeRequired"));
      return;
    }

    if (!/^[a-z][a-z0-9_]*$/i.test(newModuleCode)) {
      setModuleError(t("codeFormatError"));
      return;
    }

    if (modules.some(m => m.code === newModuleCode)) {
      setModuleError(t("codeExists"));
      return;
    }

    if (!project) return;

    setIsLoading(true);
    try {
      const updatedProject = await addModule(project.id, {
        name: newModuleName,
        code: newModuleCode,
      });
      setProject(updatedProject);
      setNewModuleName("");
      setNewModuleCode("");

      toast({
        title: t("addSuccess"),
        description: t("moduleAdded"),
      });
    } catch (error) {
      toast({
        title: t("addFailed"),
        description: error instanceof Error ? error.message : t("retryHint"),
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 删除模块
  const handleDeleteModule = async (moduleCode: string) => {
    if (!project) return;

    setIsLoading(true);
    try {
      const updatedProject = await removeModule(project.id, moduleCode);
      setProject(updatedProject);
      await fetchModuleStats();

      toast({
        title: t("deleteSuccess"),
        description: t("moduleDeleted"),
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || t("retryHint");
      toast({
        title: t("deleteFailed"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2">{t("title")}</h1>
        <p className="text-gray-600">
          {t("description")}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            {t("addNew")}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex-1">
              <Label htmlFor="moduleName" className="text-sm mb-1 block">
                {t("moduleName")}
              </Label>
              <Input
                id="moduleName"
                value={newModuleName}
                onChange={(e) => {
                  setNewModuleName(e.target.value);
                  setModuleError("");
                }}
                placeholder={t("moduleNamePlaceholder")}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddModule();
                  }
                }}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="moduleCode" className="text-sm mb-1 block">
                {t("moduleCode")}
              </Label>
              <Input
                id="moduleCode"
                value={newModuleCode}
                onChange={(e) => {
                  setNewModuleCode(e.target.value);
                  setModuleError("");
                }}
                placeholder={t("moduleCodePlaceholder")}
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddModule();
                  }
                }}
              />
            </div>
          </div>
          <div className="flex gap-2">
            {moduleError && (
              <p className="text-sm text-red-500 flex-1">{moduleError}</p>
            )}
            <Button onClick={handleAddModule} disabled={isLoading} className="ml-auto">
              <Plus className="h-4 w-4 mr-1" />
              {t("addButton")}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            {t("codeHint", { example: "smartShield.link" })}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            {t("currentModules")}
            <Badge variant="secondary">{modules.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">{t("noModules")}</p>
              <p className="text-sm">{t("noModulesHint")}</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">{t("tableModuleName")}</TableHead>
                  <TableHead className="w-[200px]">{t("tableModuleCode")}</TableHead>
                  <TableHead>{t("tableTokenCount")}</TableHead>
                  <TableHead className="text-right">{t("tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => {
                  const tokenCount = getModuleTokenCount(module.code);

                  return (
                    <TableRow key={module.code}>
                      <TableCell className="font-medium">
                        <div className="flex items-center gap-2">
                          <Package className="h-4 w-4 text-gray-500" />
                          <span className="text-gray-900">{module.name}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm">
                          {module.code}
                        </code>
                      </TableCell>
                      <TableCell>
                        <Badge variant={tokenCount > 0 ? "default" : "secondary"}>
                          {t("tokenCount", { count: tokenCount })}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="text-red-500 hover:text-red-700 hover:bg-red-50"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>{t("confirmDelete")}</AlertDialogTitle>
                              <AlertDialogDescription>
                                {tokenCount > 0 ? (
                                  <>
                                    {t("hasTokensCannotDelete", { count: tokenCount })}
                                    <br />
                                    {t("moveTokensFirst")}
                                  </>
                                ) : (
                                  <>
                                    {t("confirmDeleteDescription", { name: module.name, code: module.code })}
                                  </>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>{t("cancelButton")}</AlertDialogCancel>
                              {tokenCount === 0 && (
                                <AlertDialogAction
                                  onClick={() => handleDeleteModule(module.code)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  {t("confirmDeleteButton")}
                                </AlertDialogAction>
                              )}
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

    </div>
  );
}
