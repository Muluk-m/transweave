"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { useAtom } from "jotai";
import { nowProjectAtom, nowTeamAtom } from "@/jotai";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Plus, Search, Pencil, Trash2, Upload, Download } from "lucide-react";
import {
  listGlossary,
  createGlossary,
  updateGlossary,
  deleteGlossary,
  exportGlossary,
  importGlossary,
  type GlossaryEntry,
} from "@/api/glossary";
import { useToast } from "@/hooks/use-toast";

interface GlossaryFormData {
  sourceTerm: string;
  translations: Record<string, string>;
  description: string;
  caseSensitive: boolean;
  doNotTranslate: boolean;
}

const emptyForm: GlossaryFormData = {
  sourceTerm: "",
  translations: {},
  description: "",
  caseSensitive: false,
  doNotTranslate: false,
};

export function ProjectGlossaryTab() {
  const t = useTranslations("glossary");
  const [nowProject] = useAtom(nowProjectAtom);
  const [nowTeam] = useAtom(nowTeamAtom);
  const { toast } = useToast();

  const [entries, setEntries] = useState<GlossaryEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [isLoading, setIsLoading] = useState(false);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<GlossaryFormData>(emptyForm);

  const projectId = nowProject?.id;
  const languages = nowProject?.languages || [];

  const fetchEntries = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const result = await listGlossary({
        projectId,
        q: search || undefined,
        page,
        perPage: 50,
      });
      setEntries(result.entries);
      setTotal(result.total);
    } catch {
      toast({ title: t("fetchError"), variant: "destructive" });
    } finally {
      setIsLoading(false);
    }
  }, [projectId, search, page, t, toast]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  const openCreate = () => {
    setEditingId(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (entry: GlossaryEntry) => {
    setEditingId(entry.id);
    setForm({
      sourceTerm: entry.sourceTerm,
      translations: { ...entry.translations },
      description: entry.description || "",
      caseSensitive: entry.caseSensitive,
      doNotTranslate: entry.doNotTranslate,
    });
    setDialogOpen(true);
  };

  const handleSubmit = async () => {
    if (!form.sourceTerm.trim()) return;
    try {
      if (editingId) {
        await updateGlossary(editingId, {
          sourceTerm: form.sourceTerm,
          translations: form.translations,
          description: form.description || undefined,
          caseSensitive: form.caseSensitive,
          doNotTranslate: form.doNotTranslate,
        });
        toast({ title: t("updated") });
      } else {
        await createGlossary({
          projectId,
          sourceTerm: form.sourceTerm,
          translations: form.translations,
          description: form.description || undefined,
          caseSensitive: form.caseSensitive,
          doNotTranslate: form.doNotTranslate,
        });
        toast({ title: t("created") });
      }
      setDialogOpen(false);
      fetchEntries();
    } catch (err: any) {
      toast({
        title: err.message || t("saveError"),
        variant: "destructive",
      });
    }
  };

  const handleDelete = async (id: string) => {
    try {
      await deleteGlossary(id);
      toast({ title: t("deleted") });
      fetchEntries();
    } catch {
      toast({ title: t("deleteError"), variant: "destructive" });
    }
  };

  const handleExport = async () => {
    if (!projectId) return;
    try {
      const data = await exportGlossary({ projectId });
      const blob = new Blob([JSON.stringify(data, null, 2)], {
        type: "application/json",
      });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `glossary-${projectId}.json`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      toast({ title: t("exportError"), variant: "destructive" });
    }
  };

  const handleImport = async () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".json";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file || !projectId) return;
      try {
        const text = await file.text();
        const parsed = JSON.parse(text);
        const entries = Array.isArray(parsed) ? parsed : parsed.entries || [];
        const result = await importGlossary({ projectId, entries });
        toast({
          title: t("importSuccess", {
            created: result.created,
            updated: result.updated,
          }),
        });
        fetchEntries();
      } catch {
        toast({ title: t("importError"), variant: "destructive" });
      }
    };
    input.click();
  };

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder={t("searchPlaceholder")}
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={handleImport}>
            <Upload className="h-4 w-4 mr-1" />
            {t("import")}
          </Button>
          <Button variant="outline" size="sm" onClick={handleExport}>
            <Download className="h-4 w-4 mr-1" />
            {t("export")}
          </Button>
          <Button size="sm" onClick={openCreate}>
            <Plus className="h-4 w-4 mr-1" />
            {t("addTerm")}
          </Button>
        </div>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            <tr>
              <th className="px-4 py-3 text-left font-medium">{t("sourceTerm")}</th>
              {languages.slice(0, 3).map((lang) => (
                <th key={lang} className="px-4 py-3 text-left font-medium">
                  {lang}
                </th>
              ))}
              <th className="px-4 py-3 text-left font-medium">{t("description")}</th>
              <th className="px-4 py-3 text-right font-medium w-24">{t("actions")}</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {entries.map((entry) => (
              <tr key={entry.id} className="hover:bg-muted/30">
                <td className="px-4 py-3 font-medium">
                  {entry.sourceTerm}
                  {entry.doNotTranslate && (
                    <span className="ml-2 text-xs px-1.5 py-0.5 rounded bg-warning/10 text-warning">
                      DNT
                    </span>
                  )}
                </td>
                {languages.slice(0, 3).map((lang) => (
                  <td key={lang} className="px-4 py-3 text-muted-foreground">
                    {entry.translations[lang] || "—"}
                  </td>
                ))}
                <td className="px-4 py-3 text-muted-foreground truncate max-w-[200px]">
                  {entry.description || "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <div className="flex justify-end gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => openEdit(entry)}
                    >
                      <Pencil className="h-3.5 w-3.5" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 text-destructive"
                      onClick={() => handleDelete(entry.id)}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
            {entries.length === 0 && !isLoading && (
              <tr>
                <td
                  colSpan={languages.slice(0, 3).length + 3}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t("empty")}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {total > 50 && (
        <div className="flex justify-center gap-2">
          <Button
            variant="outline"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            {t("prev")}
          </Button>
          <span className="flex items-center text-sm text-muted-foreground">
            {page} / {Math.ceil(total / 50)}
          </span>
          <Button
            variant="outline"
            size="sm"
            disabled={page >= Math.ceil(total / 50)}
            onClick={() => setPage((p) => p + 1)}
          >
            {t("next")}
          </Button>
        </div>
      )}

      {/* Create/Edit Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editingId ? t("editTitle") : t("addTitle")}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>{t("sourceTerm")}</Label>
              <Input
                value={form.sourceTerm}
                onChange={(e) =>
                  setForm((f) => ({ ...f, sourceTerm: e.target.value }))
                }
                placeholder={t("sourceTermPlaceholder")}
              />
            </div>
            <div>
              <Label>{t("description")}</Label>
              <Textarea
                value={form.description}
                onChange={(e) =>
                  setForm((f) => ({ ...f, description: e.target.value }))
                }
                placeholder={t("descriptionPlaceholder")}
                rows={2}
              />
            </div>
            <div className="space-y-2">
              <Label>{t("translations")}</Label>
              {languages.map((lang) => (
                <div key={lang} className="flex items-center gap-2">
                  <span className="w-16 text-sm text-muted-foreground shrink-0">
                    {lang}
                  </span>
                  <Input
                    value={form.translations[lang] || ""}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        translations: {
                          ...f.translations,
                          [lang]: e.target.value,
                        },
                      }))
                    }
                    placeholder={t("translationPlaceholder", { lang })}
                  />
                </div>
              ))}
            </div>
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.caseSensitive}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, caseSensitive: v }))
                  }
                />
                <Label>{t("caseSensitive")}</Label>
              </div>
              <div className="flex items-center gap-2">
                <Switch
                  checked={form.doNotTranslate}
                  onCheckedChange={(v) =>
                    setForm((f) => ({ ...f, doNotTranslate: v }))
                  }
                />
                <Label>{t("doNotTranslate")}</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>
              {t("cancel")}
            </Button>
            <Button onClick={handleSubmit}>{t("save")}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
