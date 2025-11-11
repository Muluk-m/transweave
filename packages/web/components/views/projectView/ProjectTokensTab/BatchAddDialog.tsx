"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Plus, Trash2, AlertCircle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BatchAddDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (tokens: BatchTokenInput[]) => Promise<void>;
  isLoading: boolean;
}

export interface BatchTokenInput {
  key: string;
  tags: string[];
  comment: string;
  translations?: Record<string, string>;
}

interface TableRow {
  id: string;
  key: string;
  tags: string;
  comment: string;
  error?: string;
}

export function BatchAddDialog({
  isOpen,
  onOpenChange,
  onSubmit,
  isLoading,
}: BatchAddDialogProps) {
  const t = useTranslations("batchAdd");

  const [rows, setRows] = useState<TableRow[]>([
    { id: "1", key: "", tags: "", comment: "" },
  ]);

  const validateKey = (key: string): string | undefined => {
    if (!key.trim()) {
      return t("validation.keyRequired");
    }
    if (!/^[a-z][a-zA-Z0-9]*(\.[a-z][a-zA-Z0-9]*)*$/.test(key)) {
      return t("validation.keyInvalid");
    }
    return undefined;
  };

  const validateRow = (row: TableRow): string | undefined => {
    if (!row.key && !row.tags && !row.comment) {
      return undefined; // Empty row is ok, will be filtered out
    }

    const keyError = validateKey(row.key);
    if (keyError) return keyError;

    if (!row.comment.trim()) {
      return t("validation.commentRequired");
    }

    return undefined;
  };

  const addRow = () => {
    const newId = (parseInt(rows[rows.length - 1]?.id || "0") + 1).toString();
    setRows([...rows, { id: newId, key: "", tags: "", comment: "" }]);
  };

  const deleteRow = (id: string) => {
    if (rows.length === 1) {
      // Keep at least one row, just clear it
      setRows([{ id: "1", key: "", tags: "", comment: "" }]);
    } else {
      setRows(rows.filter((row) => row.id !== id));
    }
  };

  const updateRow = (id: string, field: keyof TableRow, value: string) => {
    setRows(
      rows.map((row) => {
        if (row.id === id) {
          const updated = { ...row, [field]: value };
          // Clear error when user types
          if (field !== "error") {
            updated.error = undefined;
          }
          return updated;
        }
        return row;
      })
    );
  };

  const handleSubmit = async () => {
    // Validate all rows
    const validatedRows = rows.map((row) => ({
      ...row,
      error: validateRow(row),
    }));

    setRows(validatedRows);

    // Filter out empty rows
    const nonEmptyRows = validatedRows.filter(
      (row) => row.key || row.tags || row.comment
    );

    // Check for errors
    const hasErrors = nonEmptyRows.some((row) => row.error);
    if (hasErrors) {
      return;
    }

    if (nonEmptyRows.length === 0) {
      return;
    }

    // Convert to BatchTokenInput
    const tokens: BatchTokenInput[] = nonEmptyRows.map((row) => ({
      key: row.key.trim(),
      tags: row.tags
        ? row.tags.split(",").map((t) => t.trim()).filter(Boolean)
        : [],
      comment: row.comment.trim(),
    }));

    await onSubmit(tokens);
    handleCancel();
  };

  const handleCancel = () => {
    setRows([{ id: "1", key: "", tags: "", comment: "" }]);
    onOpenChange(false);
  };

  const validRowCount = rows.filter(
    (row) => row.key || row.tags || row.comment
  ).length;

  return (
    <Dialog open={isOpen} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[80vh]">
        <DialogHeader>
          <DialogTitle>{t("title")}</DialogTitle>
          <DialogDescription>{t("tableDescription")}</DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertDescription>
              <div className="text-sm space-y-1">
                <p>{t("tips.tableInput")}</p>
                <p>{t("tips.keyFormat")}</p>
              </div>
            </AlertDescription>
          </Alert>

          <ScrollArea className="h-[400px] border rounded-md">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[35%]">
                    Key <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[20%]">Tags</TableHead>
                  <TableHead className="w-[35%]">
                    {t("comment")} <span className="text-red-500">*</span>
                  </TableHead>
                  <TableHead className="w-[10%] text-center">
                    {t("actions")}
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => (
                  <TableRow key={row.id} className={row.error ? "bg-destructive/10" : ""}>
                    <TableCell>
                      <Input
                        data-row-id={row.id}
                        data-field="key"
                        placeholder="login.title"
                        value={row.key}
                        onChange={(e) => updateRow(row.id, "key", e.target.value)}
                        className={row.error && row.key ? "border-destructive" : ""}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        data-row-id={row.id}
                        data-field="tags"
                        placeholder="auth,form"
                        value={row.tags}
                        onChange={(e) => updateRow(row.id, "tags", e.target.value)}
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        data-row-id={row.id}
                        data-field="comment"
                        placeholder={t("commentPlaceholder")}
                        value={row.comment}
                        onChange={(e) => updateRow(row.id, "comment", e.target.value)}
                        className={row.error && row.comment ? "border-destructive" : ""}
                      />
                      {row.error && (
                        <p className="text-xs text-destructive mt-1">{row.error}</p>
                      )}
                    </TableCell>
                    <TableCell className="text-center">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteRow(row.id)}
                        className="h-8 w-8"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </ScrollArea>

          <div className="flex justify-between items-center">
            <Button variant="outline" size="sm" onClick={addRow}>
              <Plus className="h-4 w-4 mr-2" />
              {t("addRow")}
            </Button>
            <p className="text-sm text-muted-foreground">
              {t("rowCount", { count: validRowCount })}
            </p>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={handleCancel} disabled={isLoading}>
            {t("cancel")}
          </Button>
          <Button onClick={handleSubmit} disabled={isLoading || validRowCount === 0}>
            {isLoading ? t("submitting") : t("submit")}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
