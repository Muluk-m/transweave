"use client";
import React, { useState, useMemo } from "react";
import { Token } from "@/jotai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Check, Copy, Pencil, Trash2, ChevronLeft, ChevronRight, Package, TagIcon } from "lucide-react";
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
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataTable } from "@/hooks/use-data-table";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { Text } from "lucide-react";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { formatDate } from "@/lib/format";
import { getImageUrl } from "@/api/upload";
import { ImageIcon as ImageIconLucide } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
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
import { Badge } from "@/components/ui/badge";

interface TokenTableProps {
  tokens: Token[];
  totalPages: number;
  totalCount: number;
  languages: string[];
  languageLabels?: Record<string, string>; // 自定义语言的中文备注
  modules?: Array<{ name: string; code: string }>;
  onEdit: (token: Token) => void;
  onDelete: (tokenId: string) => void;
  onDeleteSelected: (selected: string[]) => void;
  onBatchTranslate?: (tokens: Token[]) => Promise<void>;
  onBatchSetModule?: (tokens: Token[], moduleCode: string | null) => Promise<void>;
  onBatchSetTags?: (tokens: Token[], tags: string[]) => Promise<void>;
  isBatchTranslating?: boolean;
  toolBar: React.ReactNode;
}

function TipsCopyableCell({
  children,
  value,
}: {
  children: React.ReactNode;
  value: string;
}) {
  const [isCopied, setIsCopied] = useState(false);

  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>{children}</TooltipTrigger>
        <TooltipContent
          className="text-xs p-2 max-w-[200px] gap-2 break-before-auto"
          style={
            {
              textWrap: "auto",
            } as any
          }
        >
          <span className="mr-2 break-all">{value}</span>
          {isCopied ? (
            <Check className="w-4 h-4 cursor-pointer inline" color="green" />
          ) : (
            <Copy
              className="w-4 h-4 cursor-pointer inline"
              onClick={() => {
                navigator.clipboard.writeText(value);
                setIsCopied(true);
                setTimeout(() => {
                  setIsCopied(false);
                }, 1000);
              }}
            />
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
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

  

  // Get localized language names
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

  const getToken = (id: string) => {
    return tokens.find((token) => token.id === id);
  };

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

  const columns = [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
          aria-label="Select row"
        />
      ),
      size: 32,
    },
    {
      id: "key",
      accessorKey: "key",
      header: ({ column }: { column: Column<Token, unknown> }) => (
        <DataTableColumnHeader
          className="whitespace-nowrap"
          column={column}
          title="Key"
        />
      ),
      cell: ({ cell }) => (
        <div className="line-clamp-2 text-ellipsis text-foreground">
          <TipsCopyableCell value={cell.getValue<Token["key"]>()}>
            <span>{cell.getValue<Token["key"]>()}</span>
          </TipsCopyableCell>
        </div>
      ),
      meta: {
        label: "Key",
      },
      size: 250,
    },
    {
      id: "module",
      accessorKey: "module",
      header: ({ column }: { column: Column<any, unknown> }) => (
        <DataTableColumnHeader
          className="whitespace-nowrap"
          column={column}
          title="模块"
        />
      ),
      cell: ({ row }) => {
        const moduleCode = row.original.module;
        if (!moduleCode) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }

        const moduleInfo = modules.find((m) => m.code === moduleCode);
        const label = moduleInfo ? moduleInfo.name : moduleCode;

        return (
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Badge
                  variant="secondary"
                  className="text-xs flex items-center gap-1 w-fit cursor-default"
                >
                  {label}
                </Badge>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  <div className="font-medium mb-1">{label}</div>
                  <div className="text-muted-foreground">
                    模块代码：<code>{moduleCode}</code>
                  </div>
                </div>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        );
      },
      meta: {
        label: "模块",
      },
      size: 140,
      enableSorting: true,
    },
    {
      id: "screenshots",
      accessorKey: "screenshots",
      header: ({ column }: { column: Column<any, unknown> }) => (
        <DataTableColumnHeader
          className="whitespace-nowrap"
          column={column}
          title="截图"
        />
      ),
      cell: ({ row }) => {
        const screenshots = row.original.screenshots || [];
        return (
          <div className="flex items-center gap-1">
            {screenshots.length > 0 ? (
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <div
                      className="flex items-center gap-1 cursor-pointer hover:bg-muted rounded px-2 py-1 transition-colors"
                      onClick={() => handlePreviewImages(screenshots)}
                    >
                      <ImageIconLucide className="w-4 h-4 text-primary" />
                      <span className="text-sm text-muted-foreground">{screenshots.length}</span>
                    </div>
                  </TooltipTrigger>
                  <TooltipContent side="right" sideOffset={8} className="p-2">
                    <div className="flex flex-col gap-2">
                      <div className="flex flex-wrap gap-2 max-w-[300px]">
                        {screenshots.slice(0, 3).map((screenshot: string, index: number) => (
                          <img
                            key={index}
                            src={getImageUrl(screenshot)}
                            alt={`Screenshot ${index + 1}`}
                            className="w-20 h-20 object-cover rounded border border-border"
                          />
                        ))}
                        {screenshots.length > 3 && (
                          <div className="w-20 h-20 flex items-center justify-center bg-muted rounded border border-border text-sm text-muted-foreground">
                            +{screenshots.length - 3}
                          </div>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground text-center">点击查看大图</p>
                    </div>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            ) : (
              <span className="text-muted-foreground text-sm">-</span>
            )}
          </div>
        );
      },
      meta: {
        label: "截图",
      },
      size: 80,
      enableSorting: false,
    },
    ...(languages.map((lang) => ({
      id: lang,
      accessorKey: lang,
      header: ({ column }: { column: Column<any, unknown> }) => (
        <DataTableColumnHeader
          className="whitespace-nowrap"
          column={column}
          title={getLocalizedLanguageName(lang)}
        />
      ),
      cell: ({ row }) => (
        <div className="line-clamp-2 text-foreground">
          <TipsCopyableCell value={row.original.translations?.[lang]}>
            <span>{row.original.translations?.[lang]  }</span>
          </TipsCopyableCell>
        </div>
      ),
      meta: {
        label: getLocalizedLanguageName(lang),
        icon: Text,
      },
      size: 300,
      enableSorting: false,
    })) as ColumnDef<Token>[]),
    {
      id: "tags",
      accessorKey: "tags",
      header: ({ column }: { column: Column<Token, unknown> }) => (
        <DataTableColumnHeader column={column} title="Tags" />
      ),
      cell: ({ cell }) => <div>{cell.getValue<string[]>()}</div>,
    },
    {
      id: "createdAt",
      accessorKey: "createdAt",
      header: ({ column }: { column: Column<Token, unknown> }) => (
        <DataTableColumnHeader column={column} title="创建时间" />
      ),
      cell: ({ cell }) => (
        <div>
          {formatDate(
            cell.getValue<string>(),
            {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            },
            "zh-CN"
          )}
        </div>
      ),
      size: 200,
    },
    {
      id: "actions",
      header: ({ column }: { column: Column<Token, unknown> }) => (
        <DataTableColumnHeader column={column} title={t("actions")} />
      ),
      cell: function Cell({ row }) {
        const token = getToken(row.id);
        return (
          <div className="flex items-center space-x-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => onEdit(token!)}
              className="p-1"
            >
              <Pencil size={16} />
            </Button>

            <AlertDialog>
              <AlertDialogTrigger asChild>
                <Button variant="ghost" size="sm" className="p-1 text-red-500">
                  <Trash2 size={16} />
                </Button>
              </AlertDialogTrigger>
              <AlertDialogContent>
                <AlertDialogHeader>
                  <AlertDialogTitle>{t("deleteConfirmTitle")}</AlertDialogTitle>
                  <AlertDialogDescription>
                    {t("deleteConfirmDescription")}
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>{t("cancel")}</AlertDialogCancel>
                  <AlertDialogAction
                    onClick={() => onDelete(row.id)}
                    className="bg-red-500 text-white hover:bg-red-600"
                  >
                    {t("delete")}
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </div>
        );
      },
      size: 100,
    },
  ] as ColumnDef<Token>[];

  const { table } = useDataTable({
    data: data as unknown as Token[],
    columns,
    pageCount: totalPages,
    rowCount: totalCount,
    initialState: {
      columnPinning: { left: ["select", "key"], right: ["actions"] },
      sorting: [
        {
          id: "createdAt",
          desc: true,
        },
      ],
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
      {/* 批量设置模块对话框 */}
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
                      <span>{module.name}</span>
                      <code className="text-xs text-muted-foreground">
                        ({module.code})
                      </code>
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

      {/* 批量设置标签对话框 */}
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
