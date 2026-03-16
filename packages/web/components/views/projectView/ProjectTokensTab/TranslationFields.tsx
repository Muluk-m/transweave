"use client";
import { useTranslations } from "next-intl";
import { formatLanguageDisplay } from "@/constants";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { TokenHistoryPanel } from "./TokenHistoryPanel";
import type { TokenHistory } from "@/jotai/types";

interface TranslationFieldsProps {
  languages: string[];
  languageLabels: Record<string, string>;
  translations: Record<string, string>;
  isTranslating: boolean;
  history: TokenHistory[];
  onTranslationChange: (lang: string, value: string) => void;
  onRestoreVersion?: (historyId: string) => Promise<void>;
}

export function TranslationFields({
  languages,
  languageLabels,
  translations,
  isTranslating,
  history,
  onTranslationChange,
  onRestoreVersion,
}: TranslationFieldsProps) {
  const t = useTranslations("tokenForm");

  const getLocalizedLanguageName = (langCode: string): string =>
    formatLanguageDisplay(langCode, languageLabels);

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
            <TokenHistoryPanel
              history={history}
              lang={lang}
              onRollback={(translation) => {
                onTranslationChange(lang, translation);
              }}
              onRestoreVersion={onRestoreVersion}
            />
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
        </div>
      ))}
    </>
  );
}
