"use client";

import { useState, useEffect, useCallback } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
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
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import { Save, Trash2, CheckCircle2, XCircle } from "lucide-react";
import {
  getAiConfigStatus,
  getAiConfig,
  setAiConfig,
  removeAiConfig,
  type AiConfigResponse,
  type AiConfigStatus,
} from "@/api/ai";

// Provider definitions
const PROVIDERS = [
  { value: "openai", label: "OpenAI (GPT-4o, GPT-4o-mini)", keyHint: "sk-..." },
  { value: "claude", label: "Claude (Sonnet, Haiku)", keyHint: "sk-ant-..." },
  { value: "deepl", label: "DeepL", keyHint: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx" },
  { value: "google-translate", label: "Google Translate", keyHint: "AIza..." },
] as const;

const OPENAI_MODELS = [
  { value: "gpt-4o-mini", label: "GPT-4o mini (default)" },
  { value: "gpt-4o", label: "GPT-4o" },
  { value: "gpt-4-turbo", label: "GPT-4 Turbo" },
];

const CLAUDE_MODELS = [
  { value: "claude-sonnet-4-20250514", label: "Claude Sonnet 4 (default)" },
  { value: "claude-haiku-4-20250514", label: "Claude Haiku 4" },
];

interface AiProviderSettingsProps {
  scope: "team" | "project";
  scopeId: string;
  projectId?: string;
}

export function AiProviderSettings({
  scope,
  scopeId,
  projectId,
}: AiProviderSettingsProps) {
  const t = useTranslations("aiSettings");
  const { toast } = useToast();

  // Status
  const [status, setStatus] = useState<AiConfigStatus | null>(null);
  const [existingConfig, setExistingConfig] = useState<AiConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [provider, setProvider] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");

  const hasExistingConfig = existingConfig !== null && existingConfig.provider !== undefined;

  // Load status and existing config
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      // Load resolved status if projectId is available
      if (projectId) {
        const statusResult = await getAiConfigStatus(projectId);
        setStatus(statusResult);
      }

      // Load scope-specific config
      const config = await getAiConfig(scope, scopeId);
      setExistingConfig(config);

      if (config && config.provider) {
        setProvider(config.provider);
        setModel(config.model || "");
        setBaseUrl(config.baseUrl || "");
      }
    } catch {
      // Config not found is not an error
      setExistingConfig(null);
    } finally {
      setIsLoading(false);
    }
  }, [scope, scopeId, projectId]);

  useEffect(() => {
    if (scopeId) {
      loadConfig();
    }
  }, [loadConfig, scopeId]);

  // Get the key placeholder hint based on selected provider
  const getKeyHint = (): string => {
    const found = PROVIDERS.find((p) => p.value === provider);
    return found?.keyHint || "Enter API key";
  };

  // Whether model selector should be shown
  const showModelSelector = provider === "openai" || provider === "claude";

  // Whether base URL should be shown
  const showBaseUrl = provider === "openai";

  // Get models for selected provider
  const getModels = () => {
    if (provider === "openai") return OPENAI_MODELS;
    if (provider === "claude") return CLAUDE_MODELS;
    return [];
  };

  // Get default model for provider
  const getDefaultModel = (prov: string) => {
    if (prov === "openai") return "gpt-4o-mini";
    if (prov === "claude") return "claude-sonnet-4-20250514";
    return "";
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    setApiKey("");
    setModel(getDefaultModel(value));
    setBaseUrl("");
  };

  const handleSave = async () => {
    if (!provider) {
      toast({ title: t("provider"), variant: "destructive" });
      return;
    }
    if (!apiKey && !hasExistingConfig) {
      toast({ title: t("apiKey"), variant: "destructive" });
      return;
    }

    setIsSaving(true);
    try {
      await setAiConfig(scope, scopeId, {
        provider,
        apiKey: apiKey || "__unchanged__",
        ...(model && { model }),
        ...(baseUrl && { baseUrl }),
      });
      toast({ title: t("saveSuccess") });
      setApiKey("");
      await loadConfig();
    } catch (error: any) {
      if (error?.message?.includes("400") || error?.message?.includes("Invalid")) {
        toast({ title: t("invalidKey"), variant: "destructive" });
      } else {
        toast({
          title: error?.message || "Failed to save configuration",
          variant: "destructive",
        });
      }
    } finally {
      setIsSaving(false);
    }
  };

  const handleRemove = async () => {
    try {
      await removeAiConfig(scope, scopeId);
      toast({ title: t("removeSuccess") });
      setProvider("");
      setApiKey("");
      setModel("");
      setBaseUrl("");
      setExistingConfig(null);
      // Reload status
      if (projectId) {
        const statusResult = await getAiConfigStatus(projectId);
        setStatus(statusResult);
      }
    } catch (error: any) {
      toast({
        title: error?.message || "Failed to remove configuration",
        variant: "destructive",
      });
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">Loading...</div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("title")}</CardTitle>
        <CardDescription>
          {scope === "project" ? t("projectSettings") : t("teamDefault")}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Status banner */}
        {status && projectId && (
          <div
            className={`flex items-center gap-2 p-3 rounded-lg text-sm ${
              status.configured
                ? "bg-green-50 text-green-700 dark:bg-green-950/30 dark:text-green-400"
                : "bg-muted text-muted-foreground"
            }`}
          >
            {status.configured ? (
              <>
                <CheckCircle2 className="h-4 w-4" />
                <span>
                  {t("configured")} - {status.provider}{" "}
                  ({t("configuredAt", { level: status.level || "unknown" })})
                </span>
              </>
            ) : (
              <>
                <XCircle className="h-4 w-4" />
                <span>{t("notConfigured")}</span>
              </>
            )}
          </div>
        )}

        {/* Current config display */}
        {hasExistingConfig && (
          <div className="flex items-center gap-2 flex-wrap">
            <Badge variant="secondary">{existingConfig.provider}</Badge>
            <span className="text-sm text-muted-foreground">
              Key: {existingConfig.keyHint}
            </span>
            {existingConfig.model && (
              <Badge variant="outline">{existingConfig.model}</Badge>
            )}
          </div>
        )}

        {/* Provider selector */}
        <div className="space-y-2">
          <Label>{t("provider")}</Label>
          <Select value={provider} onValueChange={handleProviderChange}>
            <SelectTrigger>
              <SelectValue placeholder={t("provider")} />
            </SelectTrigger>
            <SelectContent>
              {PROVIDERS.map((p) => (
                <SelectItem key={p.value} value={p.value}>
                  {p.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* API Key input */}
        {provider && (
          <div className="space-y-2">
            <Label>{t("apiKey")}</Label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={
                hasExistingConfig
                  ? `Current: ${existingConfig.keyHint} (leave empty to keep)`
                  : getKeyHint()
              }
            />
          </div>
        )}

        {/* Model selector */}
        {provider && showModelSelector && (
          <div className="space-y-2">
            <Label>{t("model")}</Label>
            <Select
              value={model || getDefaultModel(provider)}
              onValueChange={setModel}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {getModels().map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {/* Base URL input */}
        {provider && showBaseUrl && (
          <div className="space-y-2">
            <Label>{t("baseUrl")}</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder="https://api.openai.com/v1 (default)"
            />
          </div>
        )}
      </CardContent>

      <CardFooter className="flex justify-between">
        {/* Remove button */}
        {hasExistingConfig ? (
          <AlertDialog>
            <AlertDialogTrigger asChild>
              <Button variant="destructive" size="sm">
                <Trash2 className="h-4 w-4 mr-2" />
                {t("remove")}
              </Button>
            </AlertDialogTrigger>
            <AlertDialogContent>
              <AlertDialogHeader>
                <AlertDialogTitle>{t("remove")}</AlertDialogTitle>
                <AlertDialogDescription>
                  {t("removeConfirm")}
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  onClick={handleRemove}
                  className="bg-red-500 hover:bg-red-600"
                >
                  {t("remove")}
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        ) : (
          <div />
        )}

        {/* Save button */}
        <Button
          onClick={handleSave}
          disabled={isSaving || !provider}
          className="flex items-center gap-2"
        >
          <Save className="h-4 w-4" />
          {isSaving ? "Saving..." : t("save")}
        </Button>
      </CardFooter>
    </Card>
  );
}
