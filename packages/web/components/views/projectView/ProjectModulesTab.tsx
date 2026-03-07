"use client";

import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
import { useTranslations } from "next-intl";
import { nowProjectAtom } from "@/jotai";
import type { ProjectModule } from "@/jotai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  CardDescription,
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
import { Plus, Trash2, Package, ChevronDown, ChevronUp } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { addModule, removeModule, getModuleStats } from "@/api/project";

export function ProjectModulesTab() {
  const [project, setProject] = useAtom(nowProjectAtom);
  const { toast } = useToast();
  const t = useTranslations("modules");
  const [newModuleCode, setNewModuleCode] = useState("");
  const [newModuleDescription, setNewModuleDescription] = useState("");
  const [moduleError, setModuleError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [moduleTokenCounts, setModuleTokenCounts] = useState<Record<string, number>>({});

  const modules: ProjectModule[] = project?.modules || [];
  const [showAddForm, setShowAddForm] = useState(modules.length === 0);

  // Sync form visibility with module count
  useEffect(() => {
    if (modules.length === 0) {
      setShowAddForm(true);
    }
  }, [modules.length]);

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

  const handleAddModule = async () => {
    setModuleError("");

    if (!newModuleCode) {
      setModuleError(t("codeRequired"));
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
        code: newModuleCode,
        description: newModuleDescription || undefined,
      });
      setProject(updatedProject);
      setNewModuleCode("");
      setNewModuleDescription("");

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
    <div className="p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Package className="h-5 w-5" />
                {t("title")}
                {modules.length > 0 && (
                  <Badge variant="secondary">{modules.length}</Badge>
                )}
              </CardTitle>
              <CardDescription className="mt-1">
                {t("description")}
              </CardDescription>
            </div>
            {modules.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
              >
                {showAddForm ? (
                  <ChevronUp className="h-4 w-4 mr-1" />
                ) : (
                  <Plus className="h-4 w-4 mr-1" />
                )}
                {t("addButton")}
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Inline add form */}
          {showAddForm && (
            <div className="border rounded-lg p-4 bg-muted/30 space-y-3">
              <div className="flex items-end gap-2">
                <div className="flex-1">
                  <label htmlFor="moduleCode" className="text-sm font-medium mb-1 block">
                    {t("moduleCode")}
                  </label>
                  <Input
                    id="moduleCode"
                    value={newModuleCode}
                    onChange={(e) => {
                      setNewModuleCode(e.target.value);
                      setModuleError("");
                    }}
                    placeholder={t("moduleCodePlaceholder")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddModule();
                    }}
                  />
                </div>
                <div className="flex-1">
                  <label htmlFor="moduleDescription" className="text-sm font-medium mb-1 block">
                    {t("moduleDescription")}
                  </label>
                  <Input
                    id="moduleDescription"
                    value={newModuleDescription}
                    onChange={(e) => setNewModuleDescription(e.target.value)}
                    placeholder={t("moduleDescriptionPlaceholder")}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") handleAddModule();
                    }}
                  />
                </div>
                <Button onClick={handleAddModule} disabled={isLoading}>
                  <Plus className="h-4 w-4 mr-1" />
                  {t("addButton")}
                </Button>
              </div>
              {moduleError && (
                <p className="text-sm text-red-500">{moduleError}</p>
              )}
              <p className="text-xs text-muted-foreground">
                {t("codeHint", { example: "smartShield.login.title" })}
              </p>
            </div>
          )}

          {/* Module list */}
          {modules.length === 0 ? (
            !showAddForm && (
              <div className="text-center py-8 text-gray-500">
                <Package className="h-10 w-10 mx-auto mb-3 opacity-50" />
                <p className="text-sm">{t("noModules")}</p>
                <p className="text-xs mt-1">{t("noModulesHint")}</p>
              </div>
            )
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[200px]">{t("tableModuleCode")}</TableHead>
                  <TableHead>{t("tableDescription")}</TableHead>
                  <TableHead className="w-[120px]">{t("tableTokenCount")}</TableHead>
                  <TableHead className="text-right w-[80px]">{t("tableActions")}</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {modules.map((module) => {
                  const tokenCount = getModuleTokenCount(module.code);

                  return (
                    <TableRow key={module.code}>
                      <TableCell>
                        <code className="bg-blue-50 text-blue-700 px-2 py-1 rounded text-sm">
                          {module.code}
                        </code>
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {module.description || "—"}
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
                                  t("confirmDeleteDescription", { code: module.code })
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
