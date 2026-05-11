"use client";
import { useEffect, useMemo, useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/components/ui/use-toast";
import { Plus, Trash2, RefreshCw, Save } from "lucide-react";
import {
  listConnectors,
  createConnector,
  updateConnector,
  deleteConnector,
  probeModels,
  resolveDefault,
  setTeamDefault,
  setProjectDefault,
  type Connector,
  type EnabledModel,
} from "@/api/connectors";

type Scope = { kind: "team"; teamId: string } | { kind: "project"; teamId: string; projectId: string };

const PROVIDERS = [
  { value: "openai", label: "OpenAI", requiresBaseUrl: false },
  { value: "claude", label: "Claude", requiresBaseUrl: false },
  { value: "deepseek", label: "DeepSeek", requiresBaseUrl: false },
  { value: "gemini", label: "Gemini", requiresBaseUrl: false },
  { value: "openai-compatible", label: "OpenAI-Compatible", requiresBaseUrl: true },
  { value: "deepl", label: "DeepL", requiresBaseUrl: false },
  { value: "google-translate", label: "Google Translate", requiresBaseUrl: false },
];

export function AiConnectorsSettings({ scope }: { scope: Scope }) {
  const t = useTranslations("aiConnectors");
  const { toast } = useToast();
  const [items, setItems] = useState<Connector[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [draft, setDraft] = useState<Partial<Connector> & { apiKeyInput?: string } | null>(null);
  const [defaultInfo, setDefaultInfo] = useState<{ connectorId?: string; model?: string } | null>(null);

  useEffect(() => { void reload(); }, [scope]);

  async function reload() {
    const list = await listConnectors(scope.kind === "team" ? { teamId: scope.teamId } : { projectId: (scope as { kind: "project"; teamId: string; projectId: string }).projectId });
    setItems(list);
    if (scope.kind === "project") {
      const r = await resolveDefault((scope as { kind: "project"; teamId: string; projectId: string }).projectId);
      setDefaultInfo(r.configured ? { connectorId: r.connectorId, model: r.model } : null);
    }
  }

  const selected = useMemo(() => items.find((c) => c.id === selectedId) ?? null, [items, selectedId]);

  function startAdd() {
    setSelectedId(null);
    setDraft({
      scope: scope.kind,
      teamId: scope.teamId,
      projectId: scope.kind === "project" ? (scope as { kind: "project"; teamId: string; projectId: string }).projectId : null,
      displayName: "",
      provider: "openai",
      baseUrl: null,
      enabledModels: [],
      apiKeyInput: "",
    });
  }

  async function probe() {
    if (!draft) return;
    try {
      const res = await probeModels({ provider: draft.provider!, apiKey: draft.apiKeyInput!, baseUrl: draft.baseUrl ?? undefined });
      setDraft({ ...draft, enabledModels: res.models.map((m) => ({ modelId: m, addedManually: false })) });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: t("probeFailed"), description: msg, variant: "destructive" });
    }
  }

  async function save() {
    if (!draft) return;
    const projectId = scope.kind === "project" ? (scope as { kind: "project"; teamId: string; projectId: string }).projectId : undefined;
    try {
      if (selected) {
        await updateConnector(selected.id, {
          displayName: draft.displayName,
          baseUrl: draft.baseUrl ?? undefined,
          enabledModels: draft.enabledModels,
          apiKey: draft.apiKeyInput || undefined,
        });
      } else {
        await createConnector({
          scope: scope.kind,
          teamId: scope.teamId,
          projectId,
          displayName: draft.displayName!,
          provider: draft.provider!,
          apiKey: draft.apiKeyInput!,
          baseUrl: draft.baseUrl ?? undefined,
          enabledModels: draft.enabledModels ?? [],
        });
      }
      setDraft(null);
      await reload();
      toast({ title: t("saved") });
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      toast({ title: t("saveFailed"), description: msg, variant: "destructive" });
    }
  }

  async function remove(id: string) {
    if (!confirm(t("removeConfirm"))) return;
    await deleteConnector(id);
    if (selectedId === id) setSelectedId(null);
    await reload();
  }

  async function setAsDefault(connectorId: string, modelId: string) {
    if (scope.kind === "team") {
      await setTeamDefault(scope.teamId, { connectorId, model: modelId });
    } else {
      await setProjectDefault((scope as { kind: "project"; teamId: string; projectId: string }).projectId, { connectorId, model: modelId });
    }
    await reload();
  }

  return (
    <div className="grid grid-cols-[260px_1fr] gap-4 min-h-[480px]">
      <aside className="border-r pr-3">
        <ul className="space-y-1">
          {items.map((c) => (
            <li key={c.id}>
              <button
                onClick={() => { setSelectedId(c.id); setDraft({ ...c, apiKeyInput: "" }); }}
                className={`w-full text-left px-2 py-1.5 rounded text-sm ${selectedId === c.id ? "bg-accent" : "hover:bg-accent/50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-medium">{c.displayName}</span>
                  {c.scope === "team" && scope.kind === "project" && <Badge variant="outline" className="text-[10px]">team</Badge>}
                  {defaultInfo?.connectorId === c.id && <Badge className="text-[10px]">default</Badge>}
                </div>
                <div className="text-xs opacity-60">{c.provider} · {c.enabledModels.length} models</div>
              </button>
            </li>
          ))}
          <li>
            <button onClick={startAdd} className="w-full text-left px-2 py-1.5 rounded text-sm text-primary hover:bg-accent/50">
              <Plus className="inline w-3.5 h-3.5 mr-1" /> {t("addConnector")}
            </button>
          </li>
        </ul>
      </aside>

      <section>
        {draft ? (
          <div className="space-y-3 max-w-xl">
            <h3 className="text-lg font-semibold">{selected ? t("edit") : t("addConnector")}</h3>

            <div>
              <Label>{t("displayName")}</Label>
              <Input value={draft.displayName ?? ""} onChange={(e) => setDraft({ ...draft, displayName: e.target.value })} />
            </div>

            <div>
              <Label>{t("provider")}</Label>
              <Select
                value={draft.provider}
                onValueChange={(v) => setDraft({ ...draft, provider: v, baseUrl: PROVIDERS.find((p) => p.value === v)?.requiresBaseUrl ? "" : null })}
                disabled={!!selected}
              >
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PROVIDERS.map((p) => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>{t("apiKey")} {selected && <span className="text-xs opacity-60">({t("keepBlankUnchanged")})</span>}</Label>
              <Input
                type="password"
                value={draft.apiKeyInput ?? ""}
                onChange={(e) => setDraft({ ...draft, apiKeyInput: e.target.value })}
                placeholder={selected ? selected.keyHint : ""}
              />
            </div>

            {PROVIDERS.find((p) => p.value === draft.provider)?.requiresBaseUrl && (
              <div>
                <Label>{t("baseUrl")}</Label>
                <Input value={draft.baseUrl ?? ""} onChange={(e) => setDraft({ ...draft, baseUrl: e.target.value })} placeholder="https://…/v1" />
              </div>
            )}

            <div className="flex items-end gap-2">
              <Button variant="outline" onClick={probe}><RefreshCw className="w-4 h-4 mr-1" /> {t("fetchModels")}</Button>
              <span className="text-xs opacity-60">{(draft.enabledModels ?? []).length} {t("modelsSelected")}</span>
            </div>

            <div className="space-y-1 max-h-48 overflow-auto border rounded p-2">
              {(draft.enabledModels ?? []).map((m, i) => (
                <div key={m.modelId} className="flex justify-between text-sm">
                  <span>{m.modelId}</span>
                  <button onClick={() => setDraft({ ...draft, enabledModels: draft.enabledModels!.filter((_, j) => j !== i) })}>
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
              <AddManuallyRow onAdd={(id) => setDraft({ ...draft, enabledModels: [...(draft.enabledModels ?? []), { modelId: id, addedManually: true }] })} />
            </div>

            <div className="flex gap-2">
              <Button onClick={save}><Save className="w-4 h-4 mr-1" /> {t("save")}</Button>
              <Button variant="ghost" onClick={() => setDraft(null)}>{t("cancel")}</Button>
              {selected && (
                <Button variant="destructive" className="ml-auto" onClick={() => remove(selected.id)}>
                  <Trash2 className="w-4 h-4 mr-1" /> {t("delete")}
                </Button>
              )}
            </div>

            {selected && (selected.enabledModels.length > 0) && (
              <div className="pt-2 border-t">
                <Label className="text-xs uppercase opacity-60">{t("setAsDefault")}</Label>
                <div className="flex flex-wrap gap-1 mt-1">
                  {selected.enabledModels.map((m) => (
                    <button key={m.modelId} onClick={() => setAsDefault(selected.id, m.modelId)} className="text-xs px-2 py-1 rounded border hover:bg-accent">
                      {m.modelId}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="text-sm opacity-60 flex items-center justify-center h-full">{t("selectOrAdd")}</div>
        )}
      </section>
    </div>
  );
}

function AddManuallyRow({ onAdd }: { onAdd: (id: string) => void }) {
  const t = useTranslations("aiConnectors");
  const [v, setV] = useState("");
  return (
    <div className="flex gap-1 mt-2">
      <Input className="h-7 text-xs" placeholder={t("addManuallyPlaceholder")} value={v} onChange={(e) => setV(e.target.value)} />
      <Button size="sm" variant="outline" onClick={() => { if (v.trim()) { onAdd(v.trim()); setV(""); } }}>{t("add")}</Button>
    </div>
  );
}
