"use client"

import type * as React from "react"
import { useTranslations } from "next-intl"
import { Languages } from "@/constants"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"

interface TokenFormDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  isEditing: boolean
  isLoading: boolean
  formData: {
    key: string
    tags: string
    comment: string
    translations: Record<string, string>
  }
  languages?: string[]
  onInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void
  onTranslationChange: (lang: string, value: string) => void
  onSubmit: () => void
  onAddNew: () => void
}

export function TokenFormDrawer({
  isOpen,
  onOpenChange,
  isEditing,
  isLoading,
  formData,
  languages = [],
  onInputChange,
  onTranslationChange,
  onSubmit,
  onAddNew,
}: TokenFormDrawerProps) {
  const t = useTranslations("tokenForm")

  // Get localized language names
  const getLocalizedLanguageName = (langCode: string): string =>
    Languages.has(langCode) ? `${Languages.raw(langCode)?.label} (${langCode})` : langCode

  return (
    <Sheet open={isOpen} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-[700px]">
        <SheetHeader>
          <SheetTitle>{isEditing ? t("editTitle") : t("addTitle")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)] mt-6 pr-4">
          <div className="grid gap-6 pb-4 m-2">
            <div className="grid gap-2">
              <Label htmlFor="key">Key</Label>
              <Input
                id="key"
                name="key"
                value={formData.key}
                onChange={onInputChange}
                placeholder={t("keyPlaceholder")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="tags">{t("tags")}</Label>
              <Input
                id="tags"
                name="tags"
                value={formData.tags}
                onChange={onInputChange}
                placeholder={t("tagsPlaceholder")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="comment">{t("comment")}</Label>
              <Textarea
                id="comment"
                name="comment"
                value={formData.comment}
                onChange={onInputChange}
                placeholder={t("commentPlaceholder")}
              />
            </div>

            {languages.length > 0 && <Separator className="my-2" />}

            {/* Dynamically generate input fields for each language */}
            {languages.map((lang) => (
              <div key={lang} className="grid gap-2">
                <Label htmlFor={`lang-${lang}`}>{getLocalizedLanguageName(lang)}</Label>
                <Input
                  id={`lang-${lang}`}
                  value={formData.translations[lang] || ""}
                  onChange={(e) => onTranslationChange(lang, e.target.value)}
                  placeholder={t("translationPlaceholder", {
                    language: getLocalizedLanguageName(lang),
                  })}
                />
              </div>
            ))}
          </div>
        </ScrollArea>

        <SheetFooter className="mt-6 flex-row gap-2 sm:justify-end">
          <Button onClick={onSubmit} disabled={isLoading} className="flex-1 sm:flex-initial">
            {isLoading ? t("submitting") : isEditing ? t("update") : t("submit")}
          </Button>
          <SheetClose asChild>
            <Button variant="outline" className="flex-1 sm:flex-initial">
              {t("cancel")}
            </Button>
          </SheetClose>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  )
}
