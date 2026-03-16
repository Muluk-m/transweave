"use client";
import { useState, useRef } from "react";
import { useTranslations } from "next-intl";
import { generateTokenKeyWithAi } from "@/api/ai";
import { uploadImage } from "@/api/upload";
import { toast } from "@/hooks/use-toast";

interface UseTokenFormOptions {
  formData: {
    key: string;
    module?: string;
    tags: string;
    comment: string;
    translations: Record<string, string>;
    screenshots?: string[];
  };
  onInputChange: (
    e: React.ChangeEvent<HTMLInputElement> | React.ChangeEvent<HTMLTextAreaElement>
  ) => void;
  onScreenshotsChange: (screenshots: string[]) => void;
  projectId?: string;
  aiConfigured?: boolean;
}

export function useTokenForm({
  formData,
  onInputChange,
  onScreenshotsChange,
  projectId,
}: UseTokenFormOptions) {
  const t = useTranslations("tokenForm");
  const [isGeneratingKey, setIsGeneratingKey] = useState(false);
  const [isUploadingImage, setIsUploadingImage] = useState(false);
  const screenshotAreaRef = useRef<HTMLDivElement>(null);
  const [previewImage, setPreviewImage] = useState<{
    url: string;
    index: number;
  } | null>(null);

  const handleGenerateKey = async () => {
    if (!formData.comment) {
      toast({ title: t("enterCommentForAi") });
      return;
    }
    setIsGeneratingKey(true);
    const result = await generateTokenKeyWithAi(
      formData.comment,
      projectId || "",
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

  const uploadFile = async (file: File) => {
    if (!file.type.startsWith("image/")) {
      toast({
        title: t("error"),
        description: t("pleaseUploadImage"),
        variant: "destructive",
      });
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast({
        title: t("error"),
        description: t("imageSizeLimit"),
        variant: "destructive",
      });
      return;
    }
    setIsUploadingImage(true);
    try {
      const result = await uploadImage(file);
      const currentScreenshots = formData.screenshots || [];
      onScreenshotsChange([...currentScreenshots, result.url]);
      toast({
        title: t("uploadSuccess"),
        description: t("uploadedToCdn"),
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: t("uploadFailed"),
        description: error instanceof Error ? error.message : t("uploadFailedRetry"),
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
    event.target.value = "";
  };

  const handlePaste = async (event: React.ClipboardEvent) => {
    const items = event.clipboardData?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (item.type.indexOf("image") !== -1) {
        event.preventDefault();
        const blob = item.getAsFile();
        if (blob) {
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
      setPreviewImage({ url: formData.screenshots[newIndex], index: newIndex });
    }
  };

  const handleNextImage = () => {
    if (!previewImage || !formData.screenshots) return;
    const newIndex = previewImage.index + 1;
    if (newIndex < formData.screenshots.length) {
      setPreviewImage({ url: formData.screenshots[newIndex], index: newIndex });
    }
  };

  return {
    isGeneratingKey,
    isUploadingImage,
    screenshotAreaRef,
    previewImage,
    setPreviewImage,
    handleGenerateKey,
    handleImageUpload,
    handlePaste,
    handleRemoveScreenshot,
    handlePreviewImage,
    handlePrevImage,
    handleNextImage,
  };
}
