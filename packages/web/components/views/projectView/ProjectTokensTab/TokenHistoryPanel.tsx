"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetClose,
  SheetTrigger,
} from "@/components/ui/sheet";
import { ScrollArea } from "@/components/ui/scroll-area";
import { History, RotateCcw } from "lucide-react";
import { TokenHistory } from "@/jotai/types";
import { Avatar, AvatarImage } from "@/components/ui/avatar";
import { useMemo } from "react";
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

function InlineDiff({ oldText, newText }: { oldText: string; newText: string }) {
  if (!oldText) return <span className="text-green-600">{newText}</span>;
  if (oldText === newText) return <span>{newText}</span>;

  // Simple character-level diff using LCS
  const segments: Array<{ text: string; type: "same" | "add" | "remove" }> = [];
  let i = 0, j = 0;
  const a = oldText, b = newText;

  // Find common prefix
  while (i < a.length && i < b.length && a[i] === b[i]) i++;
  if (i > 0) segments.push({ text: b.slice(0, i), type: "same" });

  // Find common suffix
  let ai = a.length - 1, bi = b.length - 1;
  while (ai >= i && bi >= i && a[ai] === b[bi]) { ai--; bi--; }
  const suffixStart = bi + 1;

  // Middle section is the diff
  if (i <= ai) segments.push({ text: a.slice(i, ai + 1), type: "remove" });
  if (i <= bi) segments.push({ text: b.slice(i, bi + 1), type: "add" });
  if (suffixStart < b.length) segments.push({ text: b.slice(suffixStart), type: "same" });

  return (
    <span>
      {segments.map((seg, idx) => (
        <span
          key={idx}
          className={
            seg.type === "add"
              ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
              : seg.type === "remove"
                ? "bg-red-100 text-red-800 line-through dark:bg-red-900/30 dark:text-red-300"
                : ""
          }
        >
          {seg.text}
        </span>
      ))}
    </span>
  );
}

interface TokenHistoryPanelProps {
  history: TokenHistory[];
  lang: string;
  onRollback: (translation: string) => void;
  onRestoreVersion?: (historyId: string) => Promise<void>;
}

export function TokenHistoryPanel({
  history,
  lang,
  onRollback,
  onRestoreVersion,
}: TokenHistoryPanelProps) {
  const t = useTranslations("tokenForm");
  const [restoringId, setRestoringId] = useState<string | null>(null);

  const handleRestore = async (historyId: string) => {
    if (!onRestoreVersion) return;
    setRestoringId(historyId);
    try {
      await onRestoreVersion(historyId);
    } finally {
      setRestoringId(null);
    }
  };

  return (
    <Sheet>
      <SheetTrigger>
        <History className="w-4 h-4  cursor-pointer" />
      </SheetTrigger>

      <SheetContent className="sm:max-w-[700px]">
        <SheetHeader>
          <SheetTitle>{t("translationHistory")}</SheetTitle>
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-220px)] mt-6 pr-4">
          <div className="grid gap-6 pb-4 m-2">
            {history
              .filter((item, index, array) => {
                if (!item.translations?.[lang]) return false;
                if (index === 0) return true;
                const prevItem = array[index - 1];
                return item.translations[lang] !== prevItem.translations?.[lang];
              })
              .sort(
                (a, b) =>
                  new Date(b.createdAt).getTime() -
                  new Date(a.createdAt).getTime()
              )
              .map((item, idx, arr) => {
                const prevItem = idx < arr.length - 1 ? arr[idx + 1] : null;
                const prevText = prevItem?.translations?.[lang] || "";
                const currentText = item.translations[lang] || "";
                return (
                <div
                  key={item.createdAt}
                  className="flex flex-col gap-2 border-b pb-2"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span className="text-sm">
                      <InlineDiff oldText={prevText} newText={currentText} />
                    </span>
                    <div className="flex items-center gap-2">
                      {onRestoreVersion && (
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-6 text-xs px-2"
                              disabled={restoringId === item.id}
                            >
                              {restoringId === item.id
                                ? t("restoring")
                                : t("restoreVersion")}
                            </Button>
                          </AlertDialogTrigger>
                          <AlertDialogContent>
                            <AlertDialogHeader>
                              <AlertDialogTitle>
                                {t("confirmRestore")}
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                {t("restoreWarning")}
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel>
                                {t("cancel")}
                              </AlertDialogCancel>
                              <AlertDialogAction
                                onClick={() => handleRestore(item.id)}
                              >
                                {t("confirmRestoreButton")}
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      )}
                      <SheetClose asChild>
                        <RotateCcw
                          className="w-4 h-4 cursor-pointer"
                          onClick={() => {
                            onRollback(item.translations[lang]);
                          }}
                        />
                      </SheetClose>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-[12px] text-gray-500">
                    <Avatar className="h-4 w-4">
                      <AvatarImage src={item.user?.avatar || ""} />
                    </Avatar>
                    <span>{item.user?.name ?? "unknown"}</span>
                    <span>{formatDate(item.createdAt)}</span>
                  </div>
                </div>
              );
              })}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
