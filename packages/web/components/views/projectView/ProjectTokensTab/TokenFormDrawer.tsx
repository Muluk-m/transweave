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
  SheetTrigger,
} from "@/components/ui/sheet"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import { Textarea } from "@/components/ui/textarea"
import { CircleHelp, History, LanguagesIcon, RotateCcw } from "lucide-react"
import { Token, TokenHistory } from "@/jotai/types"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { Avatar } from "@/components/ui/avatar"
import { AvatarFallback, AvatarImage } from "@radix-ui/react-avatar"

interface TokenFormDrawerProps {
  isOpen: boolean
  onOpenChange: (open: boolean) => void
  isEditing: boolean
  isLoading: boolean
  isTranslating: boolean
  formData: {
    key: string
    tags: string
    comment: string
    translations: Record<string, string>
  }
  languages?: string[]
  currentToken?: Token
  onInputChange: (e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>) => void
  onTranslationChange: (lang: string, value: string) => void
  onSubmit: () => void
  onAddNew: () => void
  onTranslate: () => void
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString || Date.now());
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit'
  }).format(date);
};

export function TokenFormDrawer({
  isOpen,
  onOpenChange,
  isEditing,
  isLoading,
  isTranslating,
  formData,
  languages = [],
  currentToken,
  onInputChange,
  onTranslationChange,
  onSubmit,
  onAddNew,
  onTranslate,
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
              <Label htmlFor="key" className="flex items-center gap-1">
                <span className="text-red-500 align-text-top" style={{ fontFamily: 'SimSun,sans-serif' }}>*</span>
                Key
                <TooltipProvider delayDuration={100}>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <CircleHelp className="w-4 h-4 cursor-pointer" />
                    </TooltipTrigger>
                    <TooltipContent side="bottom">
                      <div className="text-sm text-gray-700 space-y-2">
                        <p><span className="font-medium text-gray-800">Key</span> 是 token 的唯一标识，不能重复。</p>

                        <p className="font-medium">规则：</p>
                        <ul className="list-disc list-inside pl-4 space-y-1">
                          <li>只能包含字母、<code className="bg-gray-100 text-gray-800 px-1 rounded text-xs">.</code>、数字和下划线</li>
                          <li>必须以小写字母开头</li>
                          <li>使用 <code className="bg-gray-100 text-gray-800 px-1 rounded text-xs">.</code> 分隔多级（子级）命名</li>
                        </ul>

                        <p className="font-medium">例如：</p>
                        <ul className="list-decimal list-inside pl-4 space-y-1">
                          <li><code className="bg-gray-50 px-1 rounded text-sm text-gray-900">login</code>（用途）</li>
                          <li><code className="bg-gray-50 px-1 rounded text-sm text-gray-900">userCenter.loginSuccess</code>（模块.用途）</li>
                          <li><code className="bg-gray-50 px-1 rounded text-sm text-gray-900">userCenter.login.success</code>（模块.用途.状态）</li>
                        </ul>
                      </div>
                    </TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              </Label>
              <Input
                id="key"
                name="key"
                required
                maxLength={50}
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
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`lang-${lang}`}>{getLocalizedLanguageName(lang)}</Label>
                  <TokenHistorySheet history={currentToken?.history || []} lang={lang} onRollback={(translation) => {
                    onTranslationChange(lang, translation)
                  }} />
                </div>
                <Input
                  id={`lang-${lang}`}
                  loading={isTranslating && !formData.translations[lang]}
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

        <SheetFooter className="mt-6 flex-row gap-2 items-center sm:justify-end">
          <Button size='icon' onClick={onTranslate} variant="outline" disabled={isTranslating} className="flex-1 sm:flex-initial">
            <LanguagesIcon className="w-6 h-6" />
          </Button>
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


function TokenHistorySheet({ history, lang, onRollback }: { history: TokenHistory[], lang: string, onRollback: (translation: string) => void }) {
  return <Sheet>
    <SheetTrigger>
      <History className="w-4 h-4  cursor-pointer" />
    </SheetTrigger>

    <SheetContent className="sm:max-w-[700px]">
      <SheetHeader>
        <SheetTitle>翻译历史</SheetTitle>
      </SheetHeader>

      <ScrollArea className="h-[calc(100vh-220px)] mt-6 pr-4">
        <div className="grid gap-6 pb-4 m-2">
          {
            history.filter((item, index, array) => {
              if (!item.translations[lang]) return false;
              if (index === 0) return true;
              const prevItem = array[index - 1];
              return item.translations[lang] !== prevItem.translations[lang];
            }).sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()).map((item) => (
              <div key={item.createdAt} className="flex flex-col gap-2 border-b pb-2">
                <div className="flex justify-between items-center gap-2">
                  <span>{item.translations[lang] || ''}</span>
                  <SheetClose asChild>
                    <RotateCcw className="w-4 h-4 cursor-pointer" onClick={() => {
                      onRollback(item.translations[lang])
                    }} />
                  </SheetClose>
                </div>
                <div className="flex items-center gap-2 text-[12px] text-gray-500">
                  <Avatar>
                    <AvatarImage src={item.user?.avatar ?? 'https://github.com/shadcn.png'} />
                  </Avatar>
                  <span>{item.user?.name ?? 'unknown'}</span>
                  <span>{formatDate(item.createdAt)}</span>
                </div>
              </div>
            ))
          }
        </div>
      </ScrollArea>

    </SheetContent>
  </Sheet>
}