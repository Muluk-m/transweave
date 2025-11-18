"use client";

import type * as React from "react";
import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { Languages } from "@/constants";
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
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Bot,
  CircleHelp,
  History,
  LanguagesIcon,
  RotateCcw,
} from "lucide-react";
import { Token, TokenHistory } from "@/jotai/types";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { generateTokenKeyWithAi } from "@/api/ai";
import { toast } from "@/hooks/use-toast";
import { uploadImage, getImageUrl } from "@/api/upload";
import { Image as ImageIcon, X, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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
  modules?: Array<{ name: string; code: string }>;
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
}

const formatDate = (dateString: string) => {
  const date = new Date(dateString || Date.now());
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
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
  modules = [],
  currentToken,
  onInputChange,
  onModuleChange,
  onTranslationChange,
  onScreenshotsChange,
  onSubmit,
  onAddNew,
  onTranslate,
}: TokenFormDrawerProps) {
  const t = useTranslations("tokenForm");
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const screenshotAreaRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    index: number;
  } | null>(null);

  // Get localized language names
  const getLocalizedLanguageName = (langCode: string): string =>
    Languages.has(langCode)
      ? `${Languages.raw(langCode)?.label} (${langCode})`
      : langCode;

  const handleGenerateKey = async () => {
    if (!formData.comment) {
      toast({
        title: "请输入备注，以便 AI 生成多语言 key",
      });
      return;
    }
    setIsGeneratingKey(true);
    const result = await generateTokenKeyWithAi(
      formData.comment,
      formData.tags,
      formData.module
    ).catch(() => null);
    setIsGeneratingKey(false);
    if (result) {
      onInputChange({
        target: { value: result.data, name: "key" },
      } as React.ChangeEvent<HTMLInputElement>);
    }
  };

  // 通用的文件上传函数
  const uploadFile = async (file: File) => {
    // 检查文件类型
    if (!file.type.startsWith('image/')) {
      toast({
        title: "错误",
        description: "请上传图片文件",
        variant: "destructive",
      });
      return;
    }

    // 检查文件大小（限制 5MB）
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: "错误",
        description: "图片大小不能超过 5MB",
        variant: "destructive",
      });
      return;
    }

    setIsUploadingImage(true);
    try {
      const result = await uploadImage(file);
      const currentScreenshots = formData.screenshots || [];
      // 使用 CDN 返回的 URL
      onScreenshotsChange([...currentScreenshots, result.url]);
      toast({
        title: "上传成功",
        description: `图片已成功上传到 CDN`,
      });
    } catch (error) {
      console.error('Upload error:', error);
      toast({
        title: "上传失败",
        description: error instanceof Error ? error.message : "图片上传失败，请重试",
        variant: "destructive",
      });
    } finally {
      setIsUploadingImage(false);
    }
  };

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    await uploadFile(file);
    
    // 清空 input 的值，以便可以重复上传同一文件
    event.target.value = '';
  };

  // 处理粘贴事件
  const handlePaste = async (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf('image') !== -1) {
        event.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
          // 将 Blob 转换为 File 对象
          const file = new File([blob], `screenshot-${Date.now()}.png`, {
            type: blob.type,
          });
          await uploadFile(file);
        }
        break;
      }
    }
  };

  const handleRemoveScreenshot = (index: number) => {
    const currentScreenshots = formData.screenshots || [];
    const newScreenshots = currentScreenshots.filter((_, i) => i !== index);
    onScreenshotsChange(newScreenshots);
  };

  const handlePreviewImage = (url: string, index: number) => {
    setPreviewImage({ url, index });
  };

  const handlePrevImage = () => {
    if (!previewImage || !formData.screenshots) return;
    const newIndex = previewImage.index - 1;
    if (newIndex >= 0) {
      setPreviewImage({
        url: formData.screenshots[newIndex],
        index: newIndex,
      });
    }
  };

  const handleNextImage = () => {
    if (!previewImage || !formData.screenshots) return;
    const newIndex = previewImage.index + 1;
    if (newIndex < formData.screenshots.length) {
      setPreviewImage({
        url: formData.screenshots[newIndex],
        index: newIndex,
      });
    }
  };

  return (
    <>
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && setPreviewImage(null)}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>
              截图预览 {previewImage && `(${previewImage.index + 1} / ${formData.screenshots?.length || 0})`}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative">
              <img
                src={getImageUrl(previewImage.url)}
                alt="Preview"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              {formData.screenshots && formData.screenshots.length > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handlePrevImage}
                    disabled={previewImage.index === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-500">
                    {previewImage.index + 1} / {formData.screenshots.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={handleNextImage}
                    disabled={previewImage.index === formData.screenshots.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Sheet open={isOpen} onOpenChange={onOpenChange}>
        <SheetContent className="sm:max-w-[700px]">
        <SheetHeader>
          <SheetTitle>{isEditing ? t("editTitle") : t("addTitle")}</SheetTitle>
          <SheetDescription>{t("description")}</SheetDescription>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)] mt-6 pr-4">
          <div className="grid gap-6 pb-4 m-2">
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
                            <span className="font-medium text-white">Key</span>{" "}
                            是 token 的唯一标识，不能重复。
                          </p>

                          <p className="font-medium text-white">规则：</p>
                          <ul className="list-disc list-inside pl-4 space-y-1">
                            <li>
                              只能包含字母、
                              <code className="bg-gray-700 text-gray-100 px-1 rounded text-xs">
                                .
                              </code>
                              、数字
                            </li>
                            <li>必须以小写字母开头</li>
                            <li>
                              使用{" "}
                              <code className="bg-gray-700 text-gray-100 px-1 rounded text-xs">
                                .
                              </code>{" "}
                              分隔多级（子级）命名
                            </li>
                          </ul>

                          <p className="font-medium text-white">例如：</p>
                          <ul className="list-decimal list-inside pl-4 space-y-1">
                            <li>
                              <code className="bg-gray-700 px-1 rounded text-sm text-gray-100">
                                login
                              </code>
                              （用途）
                            </li>
                            <li>
                              <code className="bg-gray-700 px-1 rounded text-sm text-gray-100">
                                userCenter.loginSuccess
                              </code>
                              （模块.用途）
                            </li>
                            <li>
                              <code className="bg-gray-700 px-1 rounded text-sm text-gray-100">
                                userCenter.login.success
                              </code>
                              （模块.用途.状态）
                            </li>
                          </ul>
                        </div>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <Button
                  variant="outline"
                  size="icon"
                  className="w-6 h-6"
                  onClick={handleGenerateKey}
                >
                  <Bot className="w-4 h-4" />
                </Button>
              </Label>
              <Input
                id="key"
                name="key"
                required
                loading={isGeneratingKey}
                maxLength={50}
                value={formData.key}
                onChange={onInputChange}
                placeholder={t("keyPlaceholder")}
              />
            </div>

            <div className="grid gap-2">
              <Label htmlFor="module">所属模块（可选）</Label>
              <Select
                value={formData.module || "__none__"}
                onValueChange={(value) => onModuleChange(value === "__none__" ? "" : value)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="选择模块" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">无模块</SelectItem>
                  {modules.map((module) => (
                    <SelectItem key={module.code} value={module.code}>
                      <div className="flex items-center gap-2">
                        <span>{module.name}</span>
                        <code className="text-xs text-gray-500">({module.code})</code>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-gray-500">
                💡 选择模块后，AI 生成的 key 会自动带上模块代码前缀
              </p>
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

            <div className="grid gap-2">
              <Label htmlFor="screenshots">上下文截图</Label>
              <div 
                className="space-y-2" 
                ref={screenshotAreaRef}
                onPaste={handlePaste}
                tabIndex={0}
              >
                <div className="flex flex-wrap gap-2">
                  {(formData.screenshots || []).map((screenshot, index) => (
                    <div
                      key={index}
                      className="relative group w-24 h-24 border rounded-md overflow-hidden cursor-pointer"
                    >
                      <img
                        src={getImageUrl(screenshot)}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-full object-cover"
                        onClick={() => handlePreviewImage(screenshot, index)}
                      />
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveScreenshot(index);
                        }}
                        className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                      >
                        <X className="w-3 h-3" />
                      </button>
                      <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-10 transition-all flex items-center justify-center">
                        <ImageIcon className="w-6 h-6 text-white opacity-0 group-hover:opacity-80 transition-opacity" />
                      </div>
                    </div>
                  ))}
                  <label
                    htmlFor="screenshot-upload"
                    className="w-24 h-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-gray-50 transition-colors"
                  >
                    {isUploadingImage ? (
                      <div className="text-xs text-gray-500">上传中...</div>
                    ) : (
                      <>
                        <Upload className="w-6 h-6 text-gray-400 mb-1" />
                        <span className="text-xs text-gray-500">上传图片</span>
                      </>
                    )}
                  </label>
                  <input
                    id="screenshot-upload"
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleImageUpload}
                    disabled={isUploadingImage}
                  />
                </div>
                <p className="text-xs text-gray-500">
                  💡 支持 JPG、PNG、GIF、WebP 格式，单个文件不超过 5MB
                </p>
                <p className="text-xs text-blue-600 font-medium">
                  ⌨️ 提示：可以直接使用 Ctrl/Cmd + V 粘贴截图
                </p>
              </div>
            </div>

            {languages.length > 0 && <Separator className="my-2" />}

            {/* Dynamically generate input fields for each language */}
            {languages.map((lang) => (
              <div key={lang} className="grid gap-2">
                <div className="flex items-center justify-between gap-2">
                  <Label htmlFor={`lang-${lang}`}>
                    {getLocalizedLanguageName(lang)}
                  </Label>
                  <TokenHistorySheet
                    history={currentToken?.history || []}
                    lang={lang}
                    onRollback={(translation) => {
                      onTranslationChange(lang, translation);
                    }}
                  />
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
          <Button
            size="icon"
            onClick={onTranslate}
            variant="outline"
            disabled={isTranslating}
            className="flex-1 sm:flex-initial"
          >
            <LanguagesIcon className="w-6 h-6" />
          </Button>
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

function TokenHistorySheet({
  history,
  lang,
  onRollback,
}: {
  history: TokenHistory[];
  lang: string;
  onRollback: (translation: string) => void;
}) {
  return (
    <Sheet>
      <SheetTrigger>
        <History className="w-4 h-4  cursor-pointer" />
      </SheetTrigger>

      <SheetContent className="sm:max-w-[700px]">
        <SheetHeader>
          <SheetTitle>翻译历史</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)] mt-6 pr-4">
          <div className="grid gap-6 pb-4 m-2">
            {history
              .filter((item, index, array) => {
                if (!item.translations?.[lang]) return false;
                if (index === 0) return true;
                const prevItem = array[index - 1];
                return item.translations[lang] !== prevItem.translations[lang];
              })
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .map((item) => (
                <div
                  key={item.createdAt}
                  className="flex flex-col gap-2 border-b pb-2"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span>{item.translations[lang] || ""}</span>
                    <SheetClose asChild>
                      <RotateCcw
                        className="w-4 h-4 cursor-pointer"
                        onClick={() => {
                          onRollback(item.translations[lang]);
                        }}
                      />
                    </SheetClose>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={item.user?.avatar || ""} />
                    </Avatar>

                    <span>{item.user?.name ?? "unknown"}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
