"use client";
import React, { useState, useMemo } from "react";
import { Token } from "@/jotai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ChevronLeft, ChevronRight, Package, TagIcon, Trash2 } from "lucide-react";
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
import { useTranslations } from "next-intl";
import { Languages as LanguagesIcon } from "lucide-react";
import { formatLanguageDisplay } from "@/constants";
import { DataTable } from "@/components/data-table/data-table";
import { useDataTable } from "@/hooks/use-data-table";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { getImageUrl } from "@/api/upload";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from "@/components/data-table/data-table-action-bar";
import { Separator } from "@/components/ui/separator";
import { createColumns } from "./columns";

interface TokenTableProps {
  tokens: Token[];
  totalPages: number;
  totalCount: number;
  languages: string[];
  languageLabels?: Record<string, string>;
  modules?: Array<{ code: string; description?: string }>;
  onEdit: (token: Token) => void;
  onDelete: (tokenId: string) => void;
  onDeleteSelected: (selected: string[]) => void;
  onBatchTranslate?: (tokens: Token[]) => Promise<void>;
  onBatchSetModule?: (tokens: Token[], moduleCode: string | null) => Promise<void>;
  onBatchSetTags?: (tokens: Token[], tags: string[]) => Promise<void>;
  isBatchTranslating?: boolean;
  toolBar: React.ReactNode;
}

export function TokenTable({
  tokens,
  totalPages,
  totalCount,
  languages,
  languageLabels = {},
  modules = [],
  toolBar,
  onEdit,
  onDelete,
  onDeleteSelected,
  onBatchTranslate,
  onBatchSetModule,
  onBatchSetTags,
  isBatchTranslating = false,
}: TokenTableProps) {
  const t = useTranslations("tokenTable");
  const [previewImages, setPreviewImages] = useState<{
    urls: string[];
    currentIndex: number;
  } | null>(null);

  const [isBatchModuleDialogOpen, setIsBatchModuleDialogOpen] = useState(false);
  const [batchModuleTargetTokens, setBatchModuleTargetTokens] = useState<Token[]>([]);
  const [batchSelectedModuleCode, setBatchSelectedModuleCode] = useState<string>("__no_module__");

  const [isBatchTagDialogOpen, setIsBatchTagDialogOpen] = useState(false);
  const [batchTagTargetTokens, setBatchTagTargetTokens] = useState<Token[]>([]);
  const [batchTagInput, setBatchTagInput] = useState<string>("");

  const getLocalizedLanguageName = (langCode: string): string =>
    formatLanguageDisplay(langCode, languageLabels);

  const data = useMemo(
    () =>
      tokens.map((token) => ({
        id: token.id,
        key: token.key,
        module: token.module || "",
        tags: token.tags || [],
        createdAt: token.createdAt,
        translations: token.translations,
        screenshots: token.screenshots || [],
      })),
    [tokens]
  );

  const getToken = (id: string) => tokens.find((token) => token.id === id);

  const handlePreviewImages = (screenshots: string[]) => {
    if (screenshots.length > 0) {
      setPreviewImages({ urls: screenshots, currentIndex: 0 });
    }
  };

  const handlePrevImage = () => {
    if (!previewImages) return;
    const newIndex = previewImages.currentIndex - 1;
    if (newIndex >= 0) {
      setPreviewImages({ ...previewImages, currentIndex: newIndex });
    }
  };

  const handleNextImage = () => {
    if (!previewImages) return;
    const newIndex = previewImages.currentIndex + 1;
    if (newIndex < previewImages.urls.length) {
      setPreviewImages({ ...previewImages, currentIndex: newIndex });
    }
  };

  const columns = useMemo(
    () =>
      createColumns({
        languages,
        modules,
        getLocalizedLanguageName,
        getToken,
        onEdit,
        onDelete,
        onPreviewImages: handlePreviewImages,
        t,
      }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [languages, modules, tokens]
  );

  const { table } = useDataTable({
    data: data as unknown as Token[],
    columns,
    pageCount: totalPages,
    rowCount: totalCount,
    initialState: {
      columnPinning: { left: ["select", "key"], right: ["actions"] },
      sorting: [{ id: "createdAt", desc: true }],
    },
    defaultColumn: {
      size: 300,
      minSize: 50,
      maxSize: 500,
    },
    getRowId: (row) => row.id,
  });

  const selectedRowModel = table.getFilteredSelectedRowModel();
  const hasSelection = selectedRowModel.rows.length > 0;

  return (
    <>
      {/* Batch set module dialog */}
      <Dialog
        open={isBatchModuleDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsBatchModuleDialogOpen(false);
            setBatchModuleTargetTokens([]);
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>批量设置模块</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              已选择 {batchModuleTargetTokens.length} 个词条，设置它们的所属模块：
            </p>
            <Select
              value={batchSelectedModuleCode}
              onValueChange={setBatchSelectedModuleCode}
            >
              <SelectTrigger>
                <SelectValue placeholder="选择模块" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__no_module__">无模块</SelectItem>
                {modules.map((module) => (
                  <SelectItem key={module.code} value={module.code}>
                    <div className="flex items-center gap-2">
                      <code className="text-sm">{module.code}</code>
                      {module.description && (
                        <span className="text-xs text-muted-foreground">
                          ({module.description})
                        </span>
                      )}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBatchModuleDialogOpen(false);
                  setBatchModuleTargetTokens([]);
                }}
              >
                取消
              </Button>
              <Button
                onClick={async () => {
                  if (!onBatchSetModule) return;
                  const moduleCode =
                    batchSelectedModuleCode === "__no_module__"
                      ? null
                      : batchSelectedModuleCode;
                  await onBatchSetModule(batchModuleTargetTokens, moduleCode);
                  setIsBatchModuleDialogOpen(false);
                  setBatchModuleTargetTokens([]);
                }}
              >
                确认应用
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Batch set tags dialog */}
      <Dialog
        open={isBatchTagDialogOpen}
        onOpenChange={(open) => {
          if (!open) {
            setIsBatchTagDialogOpen(false);
            setBatchTagTargetTokens([]);
            setBatchTagInput("");
          }
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>批量设置标签</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              已选择 {batchTagTargetTokens.length} 个词条，设置它们的标签（逗号分隔）：
            </p>
            <Input
              value={batchTagInput}
              onChange={(e) => setBatchTagInput(e.target.value)}
              placeholder="tag1, tag2, tag3"
            />
            <div className="flex justify-end gap-2">
              <Button
                variant="outline"
                onClick={() => {
                  setIsBatchTagDialogOpen(false);
                  setBatchTagTargetTokens([]);
                  setBatchTagInput("");
                }}
              >
                取消
              </Button>
              <Button
                onClick={async () => {
                  if (!onBatchSetTags) return;
                  const tags = batchTagInput
                    .split(",")
                    .map((t) => t.trim())
                    .filter((t) => t.length > 0);
                  await onBatchSetTags(batchTagTargetTokens, tags);
                  setIsBatchTagDialogOpen(false);
                  setBatchTagTargetTokens([]);
                  setBatchTagInput("");
                }}
              >
                确认应用
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Image preview dialog */}
      <Dialog open={!!previewImages} onOpenChange={(open) => !open && setPreviewImages(null)}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>
              截图预览 {previewImages && `(${previewImages.currentIndex + 1} / ${previewImages.urls.length})`}
            </DialogTitle>
          </DialogHeader>
          {previewImages && (
            <div className="relative">
              <img
                src={getImageUrl(previewImages.urls[previewImages.currentIndex])}
                alt="Preview"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              {previewImages.urls.length > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevImage}
                    disabled={previewImages.currentIndex === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {previewImages.currentIndex + 1} / {previewImages.urls.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextImage}
                    disabled={previewImages.currentIndex === previewImages.urls.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="overflow-x-auto w-full">
        <DataTable
          table={table}
          actionBar={
            <DataTableActionBar table={table}>
              <DataTableActionBarSelection table={table} />
              <Separator
                orientation="vertical"
                className="hidden data-[orientation=vertical]:h-5 sm:block"
              />
              <div className="flex items-center gap-1.5">
                {onBatchTranslate && (
                  <DataTableActionBarAction
                    size="icon"
                    tooltip={isBatchTranslating ? "翻译中..." : "批量翻译"}
                    onClick={() => {
                      const selectedTokens = table
                        .getFilteredSelectedRowModel()
                        .rows.map((row) => getToken(row.id)!);
                      onBatchTranslate(selectedTokens);
                    }}
                    disabled={isBatchTranslating}
                  >
                    <LanguagesIcon className={isBatchTranslating ? "animate-pulse" : ""} />
                  </DataTableActionBarAction>
                )}
                {onBatchSetModule && (
                  <DataTableActionBarAction
                    size="icon"
                    tooltip="批量设置模块"
                    onClick={() => {
                      const selectedTokens = table
                        .getFilteredSelectedRowModel()
                        .rows.map((row) => getToken(row.id)!)
                        .filter(Boolean);
                      if (selectedTokens.length === 0) return;
                      setBatchModuleTargetTokens(selectedTokens);
                      setBatchSelectedModuleCode("__no_module__");
                      setIsBatchModuleDialogOpen(true);
                    }}
                    disabled={isBatchTranslating || !hasSelection}
                  >
                    <Package />
                  </DataTableActionBarAction>
                )}
                {onBatchSetTags && (
                  <DataTableActionBarAction
                    size="icon"
                    tooltip="批量设置标签"
                    onClick={() => {
                      const selectedTokens = table
                        .getFilteredSelectedRowModel()
                        .rows.map((row) => getToken(row.id)!)
                        .filter(Boolean);
                      if (selectedTokens.length === 0) return;
                      setBatchTagTargetTokens(selectedTokens);
                      setBatchTagInput("");
                      setIsBatchTagDialogOpen(true);
                    }}
                    disabled={isBatchTranslating || !hasSelection}
                  >
                    <TagIcon />
                  </DataTableActionBarAction>
                )}
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <span>
                      <DataTableActionBarAction
                        size="icon"
                        tooltip="删除选中"
                        disabled={isBatchTranslating || !hasSelection}
                      >
                        <Trash2 />
                      </DataTableActionBarAction>
                    </span>
                  </AlertDialogTrigger>
                  <AlertDialogContent>
                    <AlertDialogHeader>
                      <AlertDialogTitle>确认删除所选词条？</AlertDialogTitle>
                      <AlertDialogDescription>
                        将删除当前选中的 {selectedRowModel.rows.length} 个词条，此操作不可恢复。
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel>取消</AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => {
                          onDeleteSelected(
                            table
                              .getFilteredSelectedRowModel()
                              .rows.map((row) => row.id)
                          );
                        }}
                        className="bg-red-500 hover:bg-red-600"
                      >
                        确认删除
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </div>
            </DataTableActionBar>
          }
        >
          <DataTableToolbar table={table}>{toolBar}</DataTableToolbar>
        </DataTable>
      </div>
    </>
  );
}
