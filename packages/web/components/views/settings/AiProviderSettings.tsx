"use client";

import { useState, useEffect, useCallback, useMemo } from "react";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { useToast } from "@/components/ui/use-toast";
import { Badge } from "@/components/ui/badge";
import {
  Save,
  Trash2,
  CheckCircle2,
  XCircle,
  ChevronsUpDown,
  Check,
  RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  getAiConfigStatus,
  getAiConfig,
  setAiConfig,
  removeAiConfig,
  listAiModels,
  type AiConfigResponse,
  type AiConfigStatus,
} from "@/api/ai";

// Provider definitions
const PROVIDERS = [
  {
    value: "openai",
    label: "OpenAI",
    keyHint: "sk-...",
    isLLM: true,
    defaultModel: "gpt-4o-mini",
  },
  {
    value: "claude",
    label: "Claude",
    keyHint: "sk-ant-...",
    isLLM: true,
    defaultModel: "claude-sonnet-4-20250514",
  },
  {
    value: "deepseek",
    label: "Deepseek",
    keyHint: "sk-...",
    isLLM: true,
    defaultModel: "deepseek-chat",
  },
  {
    value: "gemini",
    label: "Google Gemini",
    keyHint: "AIza...",
    isLLM: true,
    defaultModel: "gemini-2.0-flash",
  },
  {
    value: "deepl",
    label: "DeepL",
    keyHint: "xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx:fx",
    isLLM: false,
    defaultModel: "",
  },
  {
    value: "google-translate",
    label: "Google Translate",
    keyHint: "AIza...",
    isLLM: false,
    defaultModel: "",
  },
] as const;

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
  const [existingConfig, setExistingConfig] =
    useState<AiConfigResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Form state
  const [provider, setProvider] = useState<string>("");
  const [apiKey, setApiKey] = useState<string>("");
  const [model, setModel] = useState<string>("");
  const [baseUrl, setBaseUrl] = useState<string>("");

  // Model list state
  const [availableModels, setAvailableModels] = useState<string[]>([]);
  const [isFetchingModels, setIsFetchingModels] = useState(false);
  const [modelPopoverOpen, setModelPopoverOpen] = useState(false);
  const [modelSearch, setModelSearch] = useState("");

  const hasExistingConfig =
    existingConfig !== null && existingConfig.provider !== undefined;
  const currentProvider = PROVIDERS.find((p) => p.value === provider);

  // Load status and existing config
  const loadConfig = useCallback(async () => {
    setIsLoading(true);
    try {
      if (projectId) {
        const statusResult = await getAiConfigStatus(projectId);
        setStatus(statusResult);
      }

      const config = await getAiConfig(scope, scopeId);
      setExistingConfig(config);

      if (config && config.provider) {
        setProvider(config.provider);
        setModel(config.model || "");
        setBaseUrl(config.baseUrl || "");
      }
    } catch {
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

  // Filter models based on search
  const filteredModels = useMemo(() => {
    if (!modelSearch) return availableModels;
    const search = modelSearch.toLowerCase();
    return availableModels.filter((m) => m.toLowerCase().includes(search));
  }, [availableModels, modelSearch]);

  const getKeyHint = (): string => {
    return currentProvider?.keyHint || "Enter API key";
  };

  const handleProviderChange = (value: string) => {
    setProvider(value);
    setApiKey("");
    setAvailableModels([]);
    setModelSearch("");
    const prov = PROVIDERS.find((p) => p.value === value);
    setModel(prov?.defaultModel || "");
    setBaseUrl("");
  };

  const handleFetchModels = async () => {
    if (!provider || !apiKey) {
      toast({ title: t("fetchModelsNeedKey"), variant: "destructive" });
      return;
    }

    setIsFetchingModels(true);
    try {
      const models = await listAiModels(provider, apiKey, baseUrl || undefined);
      setAvailableModels(models);
      toast({ title: t("fetchModelsSuccess", { count: models.length }) });
    } catch {
      toast({ title: t("fetchModelsFailed"), variant: "destructive" });
    } finally {
      setIsFetchingModels(false);
    }
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
      if (
        error?.message?.includes("400") ||
        error?.message?.includes("Invalid")
      ) {
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
      await loadConfig();
      setProvider("");
      setApiKey("");
      setModel("");
      setBaseUrl("");
      setAvailableModels([]);
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

        {/* Model selector (Combobox for LLM providers) */}
        {provider && currentProvider?.isLLM && (
          <div className="space-y-2">
            <Label>{t("model")}</Label>
            <div className="flex gap-2">
              <Popover
                open={modelPopoverOpen}
                onOpenChange={setModelPopoverOpen}
              >
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    aria-expanded={modelPopoverOpen}
                    className="flex-1 justify-between font-normal"
                  >
                    {model || currentProvider.defaultModel}
                    <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
                  <Command shouldFilter={false}>
                    <CommandInput
                      placeholder={t("modelSearchPlaceholder")}
                      value={modelSearch}
                      onValueChange={setModelSearch}
                    />
                    <CommandList>
                      <CommandEmpty>
                        {modelSearch ? (
                          <button
                            className="w-full px-2 py-1.5 text-sm text-left hover:bg-accent rounded cursor-pointer"
                            onClick={() => {
                              setModel(modelSearch);
                              setModelPopoverOpen(false);
                              setModelSearch("");
                            }}
                          >
                            {t("customModel")}: {modelSearch}
                          </button>
                        ) : (
                          <span>{t("noModelsFound")}</span>
                        )}
                      </CommandEmpty>
                      {filteredModels.length > 0 && (
                        <CommandGroup heading={t("availableModels")}>
                          {filteredModels.map((m) => (
                            <CommandItem
                              key={m}
                              value={m}
                              onSelect={() => {
                                setModel(m);
                                setModelPopoverOpen(false);
                                setModelSearch("");
                              }}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  model === m ? "opacity-100" : "opacity-0"
                                )}
                              />
                              {m}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      )}
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
              <Button
                variant="outline"
                size="icon"
                onClick={handleFetchModels}
                disabled={isFetchingModels || !apiKey}
                title={t("fetchModels")}
              >
                <RefreshCw
                  className={cn(
                    "h-4 w-4",
                    isFetchingModels && "animate-spin"
                  )}
                />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">
              {t("fetchModelsHint")}
            </p>
          </div>
        )}

        {/* Base URL input (for all LLM providers) */}
        {provider && currentProvider?.isLLM && (
          <div className="space-y-2">
            <Label>{t("baseUrl")}</Label>
            <Input
              value={baseUrl}
              onChange={(e) => setBaseUrl(e.target.value)}
              placeholder={t("baseUrlPlaceholder")}
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
