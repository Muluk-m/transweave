"use client";
import React, { useMemo, useState } from "react";
import { Token } from "@/jotai/types";
import { Button } from "@/components/ui/button";
import { Check, Copy, Pencil, Trash2 } from "lucide-react";
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
import { Languages } from "@/constants";
import { DataTable } from "@/components/data-table/data-table";
import { DataTableColumnHeader } from "@/components/data-table/data-table-column-header";
import { Checkbox } from "@/components/ui/checkbox";
import { useDataTable } from "@/hooks/use-data-table";
import type { Column, ColumnDef } from "@tanstack/react-table";
import { Text } from "lucide-react";
import { DataTableToolbar } from "@/components/data-table/data-table-toolbar";
import { formatDate } from "@/lib/format";
import { useQueryState } from "nuqs";
import { parseAsInteger } from "nuqs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import {
  DataTableActionBar,
  DataTableActionBarAction,
  DataTableActionBarSelection,
} from "@/components/data-table/data-table-action-bar";
import { Separator } from "@/components/ui/separator";

interface TokenTableProps {
  tokens: Token[];
  languages: string[];
  onEdit: (token: Token) => void;
  onDelete: (tokenId: string) => void;
  onDeleteSelected: (selected: string[]) => void;
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
  languages,
  toolBar,
  onEdit,
  onDelete,
  onDeleteSelected,
}: TokenTableProps) {
  const t = useTranslations("tokenTable");
  const [page] = useQueryState("page", parseAsInteger.withDefault(1));
  const [perPage] = useQueryState("perPage", parseAsInteger.withDefault(10));

  // Get localized language names
  const getLocalizedLanguageName = (langCode: string): string =>
    Languages.has(langCode)
      ? `${Languages.raw(langCode)?.label} (${langCode})`
      : langCode;

  const data = useMemo(
    () =>
      tokens.map((token) => ({
        id: token.id,
        key: token.key,
        tags: token.tags || [],
        createdAt: token.createdAt,
        ...token.translations,
      })),
    [tokens]
  );

  const getToken = (id: string) => {
    return tokens.find((token) => token.id === id);
  };

  const paginatedData = useMemo(() => {
    const start = (page - 1) * perPage;
    const end = start + perPage;
    return data.slice(start, end);
  }, [data, page, perPage]);

  const pageCount = useMemo(
    () => Math.ceil(data.length / perPage),
    [data.length, perPage]
  );

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
        <div className="bg-white line-clamp-2 text-ellipsis">
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
      cell: ({ cell }) => (
        <div className="bg-white line-clamp-2">
          <TipsCopyableCell value={cell.getValue<string>()}>
            <span>{cell.getValue<string>()}</span>
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
    data: paginatedData as unknown as Token[],
    columns,
    pageCount: pageCount,
    rowCount: tokens.length,
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

  return (
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
              <DataTableActionBarAction
                size="icon"
                tooltip="删除选中"
                onClick={() => {
                  onDeleteSelected(
                    table
                      .getFilteredSelectedRowModel()
                      .rows.map((row) => row.id)
                  );
                }}
              >
                <Trash2 />
              </DataTableActionBarAction>
            </div>
          </DataTableActionBar>
        }
      >
        <DataTableToolbar table={table}>{toolBar}</DataTableToolbar>
      </DataTable>
    </div>
  );
}
