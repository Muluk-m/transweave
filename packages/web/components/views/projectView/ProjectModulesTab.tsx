"use client";

import { useState, useEffect, useCallback } from "react";
import { useAtom } from "jotai";
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
      setModuleError("模块名称和代码不能为空");
      return;
    }

    // 验证模块代码格式：只允许字母、数字、下划线，必须以字母开头
    if (!/^[a-z][a-z0-9_]*$/i.test(newModuleCode)) {
      setModuleError("模块代码只能包含字母、数字和下划线，且必须以字母开头");
      return;
    }

    if (modules.some(m => m.code === newModuleCode)) {
      setModuleError("该模块代码已存在");
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
        title: "添加成功",
        description: "模块已添加",
      });
    } catch (error) {
      toast({
        title: "添加失败",
        description: error instanceof Error ? error.message : "请重试",
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
        title: "删除成功",
        description: "模块已删除",
      });
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || "请重试";
      toast({
        title: "删除失败",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      {/* 头部说明 */}
      <div>
        <h1 className="text-2xl font-bold mb-2">模块管理</h1>
        <p className="text-gray-600">
          管理项目的功能模块，用于组织和规范翻译 key 的命名空间
        </p>
      </div>

      {/* 添加新模块 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Plus className="h-5 w-5" />
            添加新模块
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-2">
            <div className="flex-1">
              <Label htmlFor="moduleName" className="text-sm mb-1 block">
                模块名称（中文）
              </Label>
              <Input
                id="moduleName"
                value={newModuleName}
                onChange={(e) => {
                  setNewModuleName(e.target.value);
                  setModuleError("");
                }}
                placeholder="例如：智能绿盾"
                onKeyPress={(e) => {
                  if (e.key === "Enter") {
                    handleAddModule();
                  }
                }}
              />
            </div>
            <div className="flex-1">
              <Label htmlFor="moduleCode" className="text-sm mb-1 block">
                模块代码（英文）
              </Label>
              <Input
                id="moduleCode"
                value={newModuleCode}
                onChange={(e) => {
                  setNewModuleCode(e.target.value);
                  setModuleError("");
                }}
                placeholder="例如：smartShield"
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
              添加模块
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            模块名称用于展示，模块代码将作为 key 前缀，例如：<code className="bg-muted px-1 rounded">smartShield.link</code>
          </p>
        </CardContent>
      </Card>

      {/* 模块列表 */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Package className="h-5 w-5" />
            当前模块
            <Badge variant="secondary">{modules.length}</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {modules.length === 0 ? (
            <div className="text-center py-12 text-gray-500">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg mb-2">暂无模块</p>
              <p className="text-sm">添加第一个模块，开始组织你的翻译 key</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[250px]">模块名称</TableHead>
                  <TableHead className="w-[200px]">模块代码</TableHead>
                  <TableHead>词条数量</TableHead>
                  <TableHead className="text-right">操作</TableHead>
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
                          {tokenCount} 个词条
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
                              <AlertDialogTitle>确认删除模块？</AlertDialogTitle>
                              <AlertDialogDescription>
                                {tokenCount > 0 ? (
                                  <>
                                    该模块下还有 <strong>{tokenCount}</strong>{" "}
                                    个词条，无法删除。
                                    <br />
                                    请先删除或移动这些词条到其他模块。
                                  </>
                                ) : (
                                  <>
                                    确定要删除模块{" "}
                                    <strong className="text-red-500">{module.name} ({module.code})</strong>{" "}
                                    吗？此操作无法撤销。
                                  </>
                                )}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>取消</AlertDialogCancel>
                              {tokenCount === 0 && (
                                <AlertDialogAction
                                  onClick={() => handleDeleteModule(module.code)}
                                  className="bg-red-500 hover:bg-red-600"
                                >
                                  确认删除
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
