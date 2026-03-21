"use client";

import { useCallback, useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { getTmSuggestions, type TmSuggestion } from "@/api/translation-memory";
import { Button } from "@/components/ui/button";
import { Sparkles } from "lucide-react";

interface TmSuggestionsProps {
  projectId: string;
  sourceText: string;
  sourceLang: string;
  targetLang: string;
  onApply: (text: string) => void;
}

export function TmSuggestions({
  projectId,
  sourceText,
  sourceLang,
  targetLang,
  onApply,
}: TmSuggestionsProps) {
  const t = useTranslations("tm");
  const [suggestions, setSuggestions] = useState<TmSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const fetch = useCallback(async () => {
    if (!sourceText || !sourceLang || !targetLang || !projectId) {
      setSuggestions([]);
      return;
    }
    setIsLoading(true);
    try {
      const result = await getTmSuggestions({
        projectId,
        sourceText,
        sourceLang,
        targetLang,
      });
      setSuggestions(result);
    } catch {
      setSuggestions([]);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, sourceText, sourceLang, targetLang]);

  useEffect(() => {
    const timer = setTimeout(fetch, 300);
    return () => clearTimeout(timer);
  }, [fetch]);

  if (suggestions.length === 0) return null;

  return (
    <div className="mt-1 border rounded-md bg-muted/30 overflow-hidden">
      <div className="px-3 py-1.5 text-xs font-medium text-muted-foreground flex items-center gap-1 border-b">
        <Sparkles className="h-3 w-3" />
        {t("suggestions")}
      </div>
      <div className="divide-y">
        {suggestions.map((s, i) => (
          <div
            key={i}
            className="px-3 py-2 flex items-center justify-between gap-2 hover:bg-muted/50 transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="text-sm truncate">{s.targetText}</div>
              <div className="text-xs text-muted-foreground truncate">
                {s.sourceText}
                {s.crossProject && s.projectName && (
                  <span className="ml-1 text-xs opacity-60">
                    ({s.projectName})
                  </span>
                )}
              </div>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-xs font-mono ${
                  s.similarity === 100
                    ? "text-green-600 dark:text-green-400"
                    : "text-amber-600 dark:text-amber-400"
                }`}
              >
                {s.similarity}%
              </span>
              <Button
                variant="ghost"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onApply(s.targetText)}
              >
                {t("apply")}
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
