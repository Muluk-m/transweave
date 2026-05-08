"use client";
import { useEffect, useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { formatLanguageDisplay } from "@/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TokenHistoryPanel } from "./TokenHistoryPanel";
import { ToneAdjustButton } from "./ToneAdjustButton";
import type { TokenHistory } from "@/jotai/types";
import { lintTranslation, type LintIssue } from "@/api/lint";

interface TranslationFieldsProps {
  languages: string[];
  languageLabels: Record<string, string>;
  translations: Record<string, string>;
  isTranslating: boolean;
  history: TokenHistory[];
  onTranslationChange: (lang: string, value: string) => void;
  onRestoreVersion?: (historyId: string) => Promise<void>;
  projectId?: string;
  aiConfigured?: boolean;
  defaultLang?: string;
}

export function TranslationFields({
  languages,
  languageLabels,
  translations,
  isTranslating,
  history,
  onTranslationChange,
  onRestoreVersion,
  projectId,
  aiConfigured,
  defaultLang,
}: TranslationFieldsProps) {
  const t = useTranslations("tokenForm");
  const [lintIssues, setLintIssues] = useState<Record<string, LintIssue[]>>({});
  const lastLintedRef = useRef<Record<string, string>>({});
  const debounceRef = useRef<Record<string, ReturnType<typeof setTimeout>>>({});

  const getLocalizedLanguageName = (langCode: string): string =>
    formatLanguageDisplay(langCode, languageLabels);

  // Re-lint a language only when its target text actually changes.
  useEffect(() => {
    if (!defaultLang) return;
    const sourceText = translations[defaultLang]?.trim();
    if (!sourceText) return;

    for (const lang of languages) {
      if (lang === defaultLang) continue;
      const target = translations[lang]?.trim() ?? "";
      if (target === lastLintedRef.current[lang]) continue;
      lastLintedRef.current[lang] = target;

      clearTimeout(debounceRef.current[lang]);

      if (!target) {
        setLintIssues((prev) => (prev[lang]?.length ? { ...prev, [lang]: [] } : prev));
        continue;
      }

      debounceRef.current[lang] = setTimeout(async () => {
        try {
          const { issues } = await lintTranslation({ sourceText, targetText: target, language: lang });
          setLintIssues((prev) => ({ ...prev, [lang]: issues }));
        } catch {}
      }, 500);
    }
  }, [translations, languages, defaultLang]);

  useEffect(() => {
    const timers = debounceRef.current;
    return () => {
      for (const id of Object.values(timers)) clearTimeout(id);
    };
  }, []);

  if (languages.length === 0) return null;

  return (
    <>
      <Separator className="my-2" />
      {languages.map((lang) => (
        <div key={lang} className="grid gap-2">
          <div className="flex items-center justify-between gap-2">
            <Label htmlFor={`lang-${lang}`}>
              {getLocalizedLanguageName(lang)}
            </Label>
            <div className="flex items-center gap-1">
              {aiConfigured && projectId ? (
                <ToneAdjustButton
                  projectId={projectId}
                  language={lang}
                  currentTranslation={translations[lang] || ""}
                  onPick={(candidate) => onTranslationChange(lang, candidate)}
                />
              ) : null}
              <TokenHistoryPanel
                history={history}
                lang={lang}
                onRollback={(translation) => {
                  onTranslationChange(lang, translation);
                }}
                onRestoreVersion={onRestoreVersion}
              />
            </div>
          </div>
          <Input
            id={`lang-${lang}`}
            loading={isTranslating && !translations[lang]}
            value={translations[lang] || ""}
            onChange={(e) => onTranslationChange(lang, e.target.value)}
            placeholder={t("translationPlaceholder", {
              language: getLocalizedLanguageName(lang),
            })}
          />
          {lintIssues[lang]?.length ? (
            <ul className="space-y-0.5">
              {lintIssues[lang].map((issue, idx) => (
                <li
                  key={`${issue.rule}-${idx}`}
                  className={`text-[11px] ${
                    issue.severity === "error"
                      ? "text-destructive"
                      : "text-yellow-500"
                  }`}
                >
                  • {issue.message}
                </li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </>
  );
}
