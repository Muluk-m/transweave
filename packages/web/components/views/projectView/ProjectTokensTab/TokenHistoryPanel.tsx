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
              .map((item) => (
                <div
                  key={item.createdAt}
                  className="flex flex-col gap-2 border-b pb-2"
                >
                  <div className="flex justify-between items-center gap-2">
                    <span>{item.translations[lang] || ""}</span>
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
              ))}
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}
