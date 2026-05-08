"use client";
import { Project } from "@/jotai/types";
import { Button } from "@/components/ui/button";
import { TokenFormDrawer } from "./TokenFormDrawer";
import { TokenTable } from "./TokenTable";
import { BatchAddDialog } from "./BatchAddDialog";
import { TokenToolbar } from "./TokenToolbar";
import { useTokensManager } from "./useTokensManager";
import { useTokenKeyboardShortcuts } from "./useTokenKeyboardShortcuts";
import { Plus, FileText, Keyboard } from "lucide-react";
import { useTranslations } from "next-intl";
import { Progress } from "@/components/ui/progress";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface ProjectTokensTabProps {
  project: Project | null;
}

export function ProjectTokensTab({ project }: ProjectTokensTabProps) {
  const t = useTranslations("projectTokens");
  const mgr = useTokensManager(project);
  const { searchInputRef, cheatsheetOpen, setCheatsheetOpen } =
    useTokenKeyboardShortcuts({ disabled: mgr.isDrawerOpen });

  return (
    <div className="bg-card rounded-lg">
      <TokenFormDrawer
        isOpen={mgr.isDrawerOpen}
        onOpenChange={(open) => mgr.setIsDrawerOpen(open)}
        isEditing={mgr.isEditing}
        isLoading={mgr.isLoading}
        isTranslating={mgr.isTranslating}
        formData={mgr.formData}
        languages={project?.languages}
        languageLabels={project?.languageLabels}
        modules={project?.modules}
        currentToken={mgr.currentToken}
        onInputChange={mgr.handleInputChange}
        onModuleChange={mgr.handleModuleChange}
        onTranslationChange={mgr.handleTranslationChange}
        onScreenshotsChange={mgr.handleScreenshotsChange}
        onSubmit={mgr.handleSubmit}
        onAddNew={mgr.handleOpenAddDrawer}
        onTranslate={mgr.handleTranslate}
        onRestoreVersion={mgr.handleRestoreVersion}
        aiConfigured={mgr.aiConfigured}
        projectId={project?.id}
        defaultLang={project?.defaultLang}
      />

      <div className="flex justify-between items-center mb-3">
        <h2 className="text-lg font-semibold">{t("title")}</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => mgr.setIsBatchDialogOpen(true)}>
            <FileText size={16} className="mr-2" />
            {t("batchAdd")}
          </Button>
          <Button onClick={mgr.handleOpenAddDrawer}>
            <Plus size={16} className="mr-2" />
            {t("addToken")}
          </Button>
        </div>
      </div>

      <BatchAddDialog
        isOpen={mgr.isBatchDialogOpen}
        onOpenChange={mgr.setIsBatchDialogOpen}
        onSubmit={mgr.handleBatchSubmit}
        isLoading={mgr.isBatchLoading}
      />

      {mgr.isBatchTranslating && (
        <div className="mb-4 p-4 bg-primary/10 border border-primary/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {t("batchTranslating")}
            </span>
            <span className="text-sm text-primary">{mgr.translateProgress}%</span>
          </div>
          <Progress value={mgr.translateProgress} className="h-2" />
        </div>
      )}

      {mgr.isBatchSettingModule && (
        <div className="mb-4 p-4 bg-accent/10 border border-accent/20 rounded-lg">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-foreground">
              {t("batchModuleUpdating")}
            </span>
            <span className="text-sm text-accent">{mgr.batchModuleProgress}%</span>
          </div>
          <Progress value={mgr.batchModuleProgress} className="h-2" />
        </div>
      )}

      <div className="flex justify-end -mb-2 pr-1">
        <button
          type="button"
          onClick={() => setCheatsheetOpen(true)}
          className="inline-flex items-center gap-1 text-[11px] text-muted-foreground hover:text-foreground transition-colors"
          title="键盘快捷键"
        >
          <Keyboard className="w-3 h-3" />
          ?
        </button>
      </div>

      <Dialog open={cheatsheetOpen} onOpenChange={setCheatsheetOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>键盘快捷键</DialogTitle>
          </DialogHeader>
          <div className="space-y-2 text-sm">
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">聚焦搜索框</span>
              <kbd className="px-2 py-0.5 rounded border border-border bg-muted/40 font-mono text-xs">/</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">显示/隐藏快捷键面板</span>
              <kbd className="px-2 py-0.5 rounded border border-border bg-muted/40 font-mono text-xs">?</kbd>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-muted-foreground">关闭面板</span>
              <kbd className="px-2 py-0.5 rounded border border-border bg-muted/40 font-mono text-xs">Esc</kbd>
            </div>
            <p className="pt-2 text-xs text-muted-foreground">
              输入框 / 编辑抽屉打开时快捷键自动禁用，避免与文字输入冲突。
            </p>
          </div>
        </DialogContent>
      </Dialog>

      <TokenTable
        tokens={mgr.tokens}
        totalPages={mgr.totalPages}
        totalCount={mgr.totalTokens}
        languages={project?.languages || []}
        languageLabels={project?.languageLabels}
        modules={project?.modules || []}
        onEdit={mgr.handleEditToken}
        onDelete={mgr.handleDeleteToken}
        onDeleteSelected={mgr.handleDeleteSelected}
        onBatchSetModule={mgr.handleBatchSetModule}
        onBatchSetTags={mgr.handleBatchSetTags}
        onBatchSetStatus={mgr.handleBatchSetStatus}
        onBatchTranslate={mgr.aiConfigured ? mgr.handleBatchTranslateSelected : undefined}
        isBatchTranslating={mgr.isBatchTranslating || mgr.isBatchSettingModule}
        isBatchSettingStatus={mgr.isBatchSettingStatus}
        aiConfigured={mgr.aiConfigured}
        toolBar={
          <TokenToolbar
            searchTerm={mgr.searchTerm}
            onSearchChange={mgr.handleSearchChange}
            searchInputRef={searchInputRef}
            selectedStatus={mgr.selectedStatus}
            onStatusChange={mgr.setSelectedStatus}
            selectedModule={mgr.selectedModule}
            onModuleChange={mgr.setSelectedModule}
            selectedTag={mgr.selectedTag}
            onTagChange={mgr.handleTagChange}
            modules={project?.modules || []}
            allTags={mgr.allTags}
            presets={mgr.presets}
            onTogglePreset={mgr.togglePreset}
          />
        }
      />
    </div>
  );
}
