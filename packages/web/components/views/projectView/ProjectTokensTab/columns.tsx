"use client";
import React, { useState } from "react";
import { Token } from "@/jotai/types";
import { Button } from "@/components/ui/button";
import { Bot, Check, Copy, Pencil, Trash2 } from "lucide-react";
import { useSetAtom } from "jotai";
import { agentChatTokenContextAtom } from "@/jotai";
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
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { Text } from "lucide-react";
import { formatDate } from "@/lib/format";
import { getImageUrl } from "@/api/upload";
import { ImageIcon as ImageIconLucide } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Badge } from "@/components/ui/badge";
import { TokenStatusBadge } from "./TokenStatusBadge";

// --- Reusable cell components ---

export function TipsCopyableCell({
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
          style={{ textWrap: "auto" } as any}
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
                setTimeout(() => setIsCopied(false), 1000);
              }}
            />
          )}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}

export function ModuleCell({
  moduleCode,
  modules,
}: {
  moduleCode: string;
  modules: Array<{ code: string; description?: string }>;
}) {
  if (!moduleCode) {
    return <span className="text-muted-foreground text-sm">-</span>;
  }
  const moduleInfo = modules.find((m) => m.code === moduleCode);
  const label = moduleInfo?.description || moduleCode;

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
}

export function ScreenshotCell({
  screenshots,
  onPreview,
}: {
  screenshots: string[];
  onPreview: (screenshots: string[]) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {screenshots.length > 0 ? (
        <TooltipProvider delayDuration={300}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div
                className="flex items-center gap-1 cursor-pointer hover:bg-muted rounded px-2 py-1 transition-colors"
                onClick={() => onPreview(screenshots)}
              >
                <ImageIconLucide className="w-4 h-4 text-primary" />
                <span className="text-sm text-muted-foreground">
                  {screenshots.length}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="right" sideOffset={8} className="p-2 pointer-events-none">
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
                <p className="text-xs text-muted-foreground text-center">
                  点击查看大图
                </p>
              </div>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      ) : (
        <span className="text-muted-foreground text-sm">-</span>
      )}
    </div>
  );
}

export function ActionsCell({
  token,
  onEdit,
  onDelete,
  t,
  aiConfigured,
}: {
  token: Token;
  onEdit: (token: Token) => void;
  onDelete: (tokenId: string) => void;
  t: (key: string) => string;
  aiConfigured?: boolean;
}) {
  const setAgentContext = useSetAtom(agentChatTokenContextAtom);
  return (
    <div className="flex items-center space-x-2">
      {aiConfigured && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            setAgentContext({
              tokenId: token.id,
              key: token.key,
              module: token.module || undefined,
              translations: token.translations || {},
              screenshots: token.screenshots || [],
              nonce: Date.now(),
            });
          }}
          className="p-1"
          title="询问 AI"
        >
          <Bot size={16} className="text-primary" />
        </Button>
      )}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => onEdit(token)}
        className="p-1"
      >
        <Pencil size={16} />
      </Button>
      <AlertDialog>
        <AlertDialogTrigger asChild>
          <Button variant="ghost" size="sm" className="p-1 text-destructive">
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
              onClick={() => onDelete(token.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {t("delete")}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// --- Column definitions factory ---

interface CreateColumnsOptions {
  languages: string[];
  modules: Array<{ code: string; description?: string }>;
  getLocalizedLanguageName: (langCode: string) => string;
  getToken: (id: string) => Token | undefined;
  onEdit: (token: Token) => void;
  onDelete: (tokenId: string) => void;
  onPreviewImages: (screenshots: string[]) => void;
  t: (key: string) => string;
  aiConfigured?: boolean;
}

export function createColumns({
  languages,
  modules,
  getLocalizedLanguageName,
  getToken,
  onEdit,
  onDelete,
  onPreviewImages,
  t,
  aiConfigured,
}: CreateColumnsOptions): ColumnDef<Token>[] {
  return [
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
      meta: { label: "Key" },
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
      cell: ({ row }) => (
        <ModuleCell moduleCode={row.original.module || ""} modules={modules} />
      ),
      meta: { label: "模块" },
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
      cell: ({ row }) => (
        <ScreenshotCell
          screenshots={row.original.screenshots || []}
          onPreview={onPreviewImages}
        />
      ),
      meta: { label: "截图" },
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
      cell: ({ row }) => {
        const translation = row.original.translations?.[lang];
        if (!translation) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }
        const status = row.original.translationStatus?.[lang];
        return (
          <div className="flex items-start gap-2">
            <div className="line-clamp-2 text-foreground flex-1 min-w-0">
              <TipsCopyableCell value={translation}>
                <span>{translation}</span>
              </TipsCopyableCell>
            </div>
            {status && <TokenStatusBadge status={status} className="shrink-0 mt-0.5" />}
          </div>
        );
      },
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
        if (!token) return null;
        return (
          <ActionsCell
            token={token}
            onEdit={onEdit}
            onDelete={onDelete}
            t={t}
            aiConfigured={aiConfigured}
          />
        );
      },
      size: 130,
    },
  ] as ColumnDef<Token>[];
}
