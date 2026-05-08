"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Sparkles, Loader2 } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import { adjustTone, type Tone } from "@/api/ai";

interface ToneAdjustButtonProps {
  projectId?: string;
  language: string;
  currentTranslation: string;
  onPick: (candidate: string) => void;
  disabled?: boolean;
}

const PRESET_TONES: Tone[] = ["formal", "casual", "shorter", "rephrase", "polish"];

export function ToneAdjustButton({
  projectId,
  language,
  currentTranslation,
  onPick,
  disabled,
}: ToneAdjustButtonProps) {
  const t = useTranslations("project.toneAdjust");
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [candidates, setCandidates] = useState<string[]>([]);
  const [showCandidates, setShowCandidates] = useState(false);
  const [customInstruction, setCustomInstruction] = useState("");
  const [showCustomInput, setShowCustomInput] = useState(false);

  const isDisabled = disabled || !projectId || !currentTranslation?.trim();

  const runAdjust = async (tone: Tone, instruction?: string) => {
    if (!projectId) return;
    setIsLoading(true);
    setShowCandidates(true);
    setCandidates([]);
    try {
      const res = await adjustTone({
        projectId,
        currentTranslation,
        targetLang: language,
        tone,
        customInstruction: instruction,
      });
      setCandidates(res.candidates);
    } catch (err) {
      toast({
        title: t("failedTitle"),
        description: err instanceof Error ? err.message : String(err),
        variant: "destructive",
      });
      setShowCandidates(false);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={isDisabled}
            title={t("trigger")}
            className="h-7 w-7 p-0"
          >
            <Sparkles className="w-3.5 h-3.5 text-primary" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-44">
          {PRESET_TONES.map((tone) => (
            <DropdownMenuItem key={tone} onSelect={() => runAdjust(tone)}>
              {t(`tones.${tone}`)}
            </DropdownMenuItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuItem onSelect={() => setShowCustomInput(true)}>
            {t("customLabel")}
          </DropdownMenuItem>
          <div className="px-2 py-1.5 text-[10px] text-muted-foreground">
            {t("hint")}
          </div>
        </DropdownMenuContent>
      </DropdownMenu>

      <Dialog open={showCustomInput} onOpenChange={setShowCustomInput}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>{t("customDialogTitle")}</DialogTitle>
            <DialogDescription>{t("customDialogDesc")}</DialogDescription>
          </DialogHeader>
          <Input
            value={customInstruction}
            onChange={(e) => setCustomInstruction(e.target.value)}
            placeholder={t("customPlaceholder")}
          />
          <div className="flex justify-end gap-2 mt-2">
            <Button
              variant="outline"
              onClick={() => {
                setShowCustomInput(false);
                setCustomInstruction("");
              }}
            >
              {t("cancel")}
            </Button>
            <Button
              disabled={!customInstruction.trim()}
              onClick={() => {
                const instr = customInstruction.trim();
                setShowCustomInput(false);
                setCustomInstruction("");
                runAdjust("custom", instr);
              }}
            >
              {t("generate")}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={showCandidates} onOpenChange={setShowCandidates}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{t("candidatesTitle")}</DialogTitle>
            <DialogDescription>
              {t("candidatesDescCurrent", { language })}{" "}
              <span className="font-mono">{currentTranslation}</span>
            </DialogDescription>
          </DialogHeader>
          {isLoading ? (
            <div className="flex items-center justify-center py-8 gap-2 text-muted-foreground text-sm">
              <Loader2 className="w-4 h-4 animate-spin" />
              {t("loading")}
            </div>
          ) : candidates.length === 0 ? (
            <div className="text-sm text-muted-foreground py-4 text-center">
              {t("noCandidates")}
            </div>
          ) : (
            <div className="space-y-2">
              {candidates.map((c, idx) => (
                <div
                  key={idx}
                  className="border border-border rounded-md p-3 hover:border-primary/40 transition-colors"
                >
                  <div className="text-sm font-mono mb-2">{c}</div>
                  <div className="flex justify-end">
                    <Button
                      size="sm"
                      onClick={() => {
                        onPick(c);
                        setShowCandidates(false);
                      }}
                    >
                      {t("adopt")}
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
