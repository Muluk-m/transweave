"use client";
import React from "react";
import { useTranslations } from "next-intl";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { getImageUrl } from "@/api/upload";
import { Image as ImageIcon, X, Upload, ChevronLeft, ChevronRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ScreenshotManagerProps {
  screenshots: string[];
  isUploadingImage: boolean;
  screenshotAreaRef: React.Ref<HTMLDivElement>;
  previewImage: { url: string; index: number } | null;
  onPaste: (event: React.ClipboardEvent) => void;
  onImageUpload: (event: React.ChangeEvent<HTMLInputElement>) => void;
  onRemoveScreenshot: (index: number) => void;
  onPreviewImage: (url: string, index: number) => void;
  onPrevImage: () => void;
  onNextImage: () => void;
  onClosePreview: () => void;
}

export function ScreenshotManager({
  screenshots,
  isUploadingImage,
  screenshotAreaRef,
  previewImage,
  onPaste,
  onImageUpload,
  onRemoveScreenshot,
  onPreviewImage,
  onPrevImage,
  onNextImage,
  onClosePreview,
}: ScreenshotManagerProps) {
  const t = useTranslations("tokenForm");

  return (
    <>
      <Dialog open={!!previewImage} onOpenChange={(open) => !open && onClosePreview()}>
        <DialogContent className="max-w-4xl w-full">
          <DialogHeader>
            <DialogTitle>
              {t("screenshotPreview")}{" "}
              {previewImage &&
                `(${previewImage.index + 1} / ${screenshots.length})`}
            </DialogTitle>
          </DialogHeader>
          {previewImage && (
            <div className="relative">
              <img
                src={getImageUrl(previewImage.url)}
                alt="Preview"
                className="w-full h-auto max-h-[70vh] object-contain rounded-lg"
              />
              {screenshots.length > 1 && (
                <div className="flex justify-between items-center mt-4">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onPrevImage}
                    disabled={previewImage.index === 0}
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </Button>
                  <span className="text-sm text-gray-500">
                    {previewImage.index + 1} / {screenshots.length}
                  </span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={onNextImage}
                    disabled={previewImage.index === screenshots.length - 1}
                  >
                    <ChevronRight className="w-4 h-4" />
                  </Button>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>

      <div className="grid gap-2">
        <Label htmlFor="screenshots">{t("contextScreenshots")}</Label>
        <div
          className="space-y-2"
          ref={screenshotAreaRef}
          onPaste={onPaste}
          tabIndex={0}
        >
          <div className="flex flex-wrap gap-2">
            {screenshots.map((screenshot, index) => (
              <div
                key={index}
                className="relative group w-24 h-24 border rounded-md overflow-hidden cursor-pointer"
              >
                <img
                  src={getImageUrl(screenshot)}
                  alt={`Screenshot ${index + 1}`}
                  className="w-full h-full object-cover"
                  onClick={() => onPreviewImage(screenshot, index)}
                />
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveScreenshot(index);
                  }}
                  className="absolute top-1 right-1 bg-destructive text-destructive-foreground rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity z-10"
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
              className="w-24 h-24 border-2 border-dashed rounded-md flex flex-col items-center justify-center cursor-pointer hover:bg-muted/50 transition-colors"
            >
              {isUploadingImage ? (
                <div className="text-xs text-muted-foreground">
                  {t("uploading")}
                </div>
              ) : (
                <>
                  <Upload className="w-6 h-6 text-muted-foreground/60 mb-1" />
                  <span className="text-xs text-muted-foreground">
                    {t("uploadImage")}
                  </span>
                </>
              )}
            </label>
            <input
              id="screenshot-upload"
              type="file"
              accept="image/*"
              className="hidden"
              onChange={onImageUpload}
              disabled={isUploadingImage}
            />
          </div>
          <p className="text-xs text-gray-500">{t("imageFormatHint")}</p>
          <p className="text-xs text-primary font-medium">{t("pasteHint")}</p>
        </div>
      </div>
    </>
  );
}
