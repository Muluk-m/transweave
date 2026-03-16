"use client";

import type * as React from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
  SheetClose,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bot, CircleHelp, LanguagesIcon } from "lucide-react";
import { Token } from "@/jotai/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useTokenForm } from "./useTokenForm";
import { ScreenshotManager } from "./ScreenshotManager";
import { TranslationFields } from "./TranslationFields";

interface TokenFormDrawerProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  isEditing: boolean;
  isLoading: boolean;
  isTranslating: boolean;
  formData: {
    key: string;
    module?: string;
    tags: string;
    comment: string;
    translations: Record<string, string>;
    screenshots?: string[];
  };
  languages?: string[];
  languageLabels?: Record<string, string>;
  modules?: Array<{ code: string; description?: string }>;
  currentToken?: Token;
  onInputChange: (
    e:
      | React.ChangeEvent<HTMLInputElement>
      | React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
  onModuleChange: (module: string) => void;
  onTranslationChange: (lang: string, value: string) => void;
  onScreenshotsChange: (screenshots: string[]) => void;
  onSubmit: () => void;
  onAddNew: () => void;
  onTranslate: () => void;
  onRestoreVersion?: (historyId: string) => Promise<void>;
  aiConfigured?: boolean;
  projectId?: string;
}

export function TokenFormDrawer({
  isOpen,
  onOpenChange,
  isEditing,
  isLoading,
  isTranslating,
  formData,
  languages = [],
  languageLabels = {},
  modules = [],
  currentToken,
  onInputChange,
  onModuleChange,
  onTranslationChange,
  onScreenshotsChange,
  onSubmit,
  onTranslate,
  onRestoreVersion,
  aiConfigured = false,
  projectId,
}: TokenFormDrawerProps) {
  const t = useTranslations("tokenForm");

  const form = useTokenForm({
    formData,
    onInputChange,
    onScreenshotsChange,
    projectId,
    aiConfigured,
  });

  return (
    <>
      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[700px]">
          <SheetHeader>
            <SheetTitle>
              {isEditing ? t("editTitle") : t("addTitle")}
            </SheetTitle>
            <SheetDescription>{t("description")}</SheetDescription>
          </SheetHeader>

          <ScrollArea className="h-[calc(100vh-220px)] mt-6 pr-4">
            <div className="grid gap-6 pb-4 m-2">
              {/* Key field */}
              <div className="grid gap-2">
                <Label
                  htmlFor="key"
                  className="flex items-center gap-1 justify-between"
                >
                  <div className="flex items-center gap-1">
                    <span
                      className="text-red-500 align-text-top"
                      style={{ fontFamily: "SimSun,sans-serif" }}
                    >
                      *
                    </span>
                    Key
                    <TooltipProvider delayDuration={100}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <CircleHelp className="w-4 h-4 cursor-pointer" />
                        </TooltipTrigger>
                        <TooltipContent side="bottom">
                          <div className="text-sm text-gray-100 space-y-2">
                            <p>
                              <span className="font-medium text-white">
                                Key
                              </span>{" "}
                              {t("keyTooltip.description")}
                            </p>
                            <p className="font-medium text-white">
                              {t("keyTooltip.rules")}
                            </p>
                            <ul className="list-disc list-inside pl-4 space-y-1">
                              <li>
                                {t("keyTooltip.ruleLetters")}
                                <code className="bg-gray-700 text-gray-100 px-1 rounded text-xs">
                                  .
                                </code>
                                {t("keyTooltip.ruleNumbers")}
                              </li>
                              <li>{t("keyTooltip.ruleLowercase")}</li>
                              <li>
                                {t("keyTooltip.ruleUse")}{" "}
                                <code className="bg-gray-700 text-gray-100 px-1 rounded text-xs">
                                  .
                                </code>{" "}
                                {t("keyTooltip.ruleSeparator")}
                              </li>
                            </ul>
                            <p className="font-medium text-white">
                              {t("keyTooltip.examples")}
                            </p>
                            <ul className="list-decimal list-inside pl-4 space-y-1">
                              <li>
                                <code className="bg-gray-700 px-1 rounded text-sm text-gray-100">
                                  login
                                </code>
                                {t("keyTooltip.exUsage")}
                              </li>
                              <li>
                                <code className="bg-gray-700 px-1 rounded text-sm text-gray-100">
                                  userCenter.loginSuccess
                                </code>
                                {t("keyTooltip.exModuleUsage")}
                              </li>
                              <li>
                                <code className="bg-gray-700 px-1 rounded text-sm text-gray-100">
                                  userCenter.login.success
                                </code>
                                {t("keyTooltip.exModuleUsageState")}
                              </li>
                            </ul>
                          </div>
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  </div>
                  {aiConfigured && (
                    <Button
                      variant="outline"
                      size="icon"
                      className="w-6 h-6"
                      onClick={form.handleGenerateKey}
                    >
                      <Bot className="w-4 h-4" />
                    </Button>
                  )}
                </Label>
                <Input
                  id="key"
                  name="key"
                  required
                  loading={form.isGeneratingKey}
                  maxLength={50}
                  value={formData.key}
                  onChange={onInputChange}
                  placeholder={t("keyPlaceholder")}
                />
              </div>

              {/* Module field */}
              <div className="grid gap-2">
                <Label htmlFor="module">{t("moduleLabel")}</Label>
                <Select
                  value={formData.module || "__none__"}
                  onValueChange={(value) =>
                    onModuleChange(value === "__none__" ? "" : value)
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder={t("modulePlaceholder")} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="__none__">{t("noModule")}</SelectItem>
                    {modules.map((module) => (
                      <SelectItem key={module.code} value={module.code}>
                        <div className="flex items-center gap-2">
                          <code className="text-sm">{module.code}</code>
                          {module.description && (
                            <span className="text-xs text-gray-500">
                              ({module.description})
                            </span>
                          )}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-gray-500">{t("moduleHint")}</p>
              </div>

              {/* Tags field */}
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

              {/* Comment field */}
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

              {/* Screenshots */}
              <ScreenshotManager
                screenshots={formData.screenshots || []}
                isUploadingImage={form.isUploadingImage}
                screenshotAreaRef={form.screenshotAreaRef}
                previewImage={form.previewImage}
                onPaste={form.handlePaste}
                onImageUpload={form.handleImageUpload}
                onRemoveScreenshot={form.handleRemoveScreenshot}
                onPreviewImage={form.handlePreviewImage}
                onPrevImage={form.handlePrevImage}
                onNextImage={form.handleNextImage}
                onClosePreview={() => form.setPreviewImage(null)}
              />

              {/* Translation fields */}
              <TranslationFields
                languages={languages}
                languageLabels={languageLabels}
                translations={formData.translations}
                isTranslating={isTranslating}
                history={currentToken?.history || []}
                onTranslationChange={onTranslationChange}
                onRestoreVersion={onRestoreVersion}
              />
            </div>
          </ScrollArea>

          <SheetFooter className="mt-6 flex-row gap-2 items-center sm:justify-end">
            {aiConfigured && (
              <Button
                size="icon"
                onClick={onTranslate}
                variant="outline"
                disabled={isTranslating}
                className="flex-1 sm:flex-initial"
              >
                <LanguagesIcon className="w-6 h-6" />
              </Button>
            )}
            <Button
              onClick={onSubmit}
              disabled={isLoading}
              className="flex-1 sm:flex-initial"
            >
              {isLoading
                ? t("submitting")
                : isEditing
                ? t("update")
                : t("submit")}
            </Button>
            <SheetClose asChild>
              <Button variant="outline" className="flex-1 sm:flex-initial">
                {t("cancel")}
              </Button>
            </SheetClose>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );
}
