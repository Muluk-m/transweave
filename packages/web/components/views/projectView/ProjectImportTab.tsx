'use client'
import { useCallback, useState } from "react";
import { Project } from "@/jotai/types";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Upload, CheckCircle2, AlertCircle, FileJson, FileText, Table as TableIcon } from "lucide-react";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useDropzone } from "react-dropzone";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { getProject, importProjectTokens, previewImportTokens } from "@/api/project";
import { useTranslations } from "next-intl";
import { formatLanguageDisplay } from "@/constants";
import { useToast } from "@/components/ui/use-toast";
import { nowProjectAtom } from "@/jotai";
import { useSetAtom } from "jotai";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

interface ProjectImportTabProps {
    project: Project | null;
}

interface PreviewChanges {
    toAdd: Array<{ key: string; translation: string }>;
    toUpdate: Array<{ 
        key: string; 
        oldTranslation: string; 
        newTranslation: string;
        tags?: string[];
        comment?: string;
    }>;
    toDelete: Array<{ key: string; translation: string }>;
    unchanged: Array<{ key: string; translation: string }>;
    stats: {
        added: number;
        updated: number;
        deleted: number;
        unchanged: number;
        total: number;
    };
}

export function ProjectImportTab({ project }: ProjectImportTabProps) {
    const t = useTranslations();
    const setNowProject = useSetAtom(nowProjectAtom);
    const [importOption, setImportOption] = useState<'append' | 'replace'>('append');
    const [importStatus, setImportStatus] = useState<'idle' | 'success' | 'error' | 'loading'>('idle');
    const [importMessage, setImportMessage] = useState<string>('');
    const [importedFiles, setImportedFiles] = useState<File[]>([]);
    const [selectedLanguage, setSelectedLanguage] = useState<string>('');
    const [stats, setStats] = useState<{ added: number; updated: number; unchanged: number; total: number } | null>(null);
    const [showPreview, setShowPreview] = useState(false);
    const [previewChanges, setPreviewChanges] = useState<PreviewChanges | null>(null);
    const [isLoadingPreview, setIsLoadingPreview] = useState(false);

    const { toast } = useToast();

    // Handle file drop for upload
    const onDrop = useCallback((acceptedFiles: File[]) => {
        setImportedFiles(acceptedFiles);
        setImportStatus('idle');
        setStats(null);
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/json': ['.json'],
            'text/csv': ['.csv'],
            'application/xml': ['.xml', '.xlf', '.xliff'],
            'text/yaml': ['.yaml', '.yml'],
            'application/x-gettext': ['.po'],
        },
        multiple: false
    });

    // Get file format
    const getFileFormat = (filename: string): 'json' | 'csv' | 'xml' | 'yaml' | 'xliff' | 'po' => {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'json') return 'json';
        if (ext === 'csv') return 'csv';
        if (ext === 'xml') return 'xml';
        if (ext === 'yaml' || ext === 'yml') return 'yaml';
        if (ext === 'xlf' || ext === 'xliff') return 'xliff';
        if (ext === 'po') return 'po';
        return 'json'; // Default
    };

    // Handle preview import
    const handlePreview = async () => {
        if (importedFiles.length === 0) {
            toast({
                title: t('project.import.selectFileFirst'),
                description: t('project.import.selectFileFirst'),
            });
            return;
        }

        if (!selectedLanguage) {
            toast({
                title: t('project.import.selectLanguageFirst'),
                description: t('project.import.selectLanguageFirst'),
            });
            return;
        }

        setIsLoadingPreview(true);

        try {
            const file = importedFiles[0];
            const format = getFileFormat(file.name);
            const content = await readFileContent(file);

            const result = await previewImportTokens(project?.id || '', {
                language: selectedLanguage,
                content,
                format,
                mode: importOption
            });

            setPreviewChanges(result.changes);
            setShowPreview(true);
        } catch (error: any) {
            toast({
                title: '预览失败',
                description: error.message || '无法预览导入内容',
                variant: 'destructive',
            });
        } finally {
            setIsLoadingPreview(false);
        }
    };

    // Handle import button click - show preview first
    const handleImportClick = async () => {
        if (importedFiles.length === 0) {
            toast({
                title: t('project.import.selectFileFirst'),
                description: t('project.import.selectFileFirst'),
            });
            return;
        }

        if (!selectedLanguage) {
            toast({
                title: t('project.import.selectLanguageFirst'),
                description: t('project.import.selectLanguageFirst'),
            });
            return;
        }

        // Always show preview before importing
        await handlePreview();
    };

    // Handle confirmed import after preview
    const handleConfirmedImport = async () => {
        // Set loading state
        setImportStatus('loading');
        setImportMessage(t('project.import.status.processing'));
        setShowPreview(false);

        try {
            const file = importedFiles[0];
            const format = getFileFormat(file.name);

            // Read file content
            const content = await readFileContent(file);

            // Call API to import data
            const result = await importProjectTokens(project?.id || '', {
                language: selectedLanguage,
                content,
                format,
                mode: importOption
            });

            // Set success state and statistics
            setImportStatus('success');
            setImportMessage(result.message || t('project.import.status.success'));
            setStats(result.stats);

            toast({
                title: t('project.import.status.success'),
                description: result.message || t('project.import.status.success'),
            });

            const newProject = await getProject(project?.id || '');
            setNowProject(newProject);
        } catch (error: any) {
            setImportStatus('error');
            setImportMessage(error.message || t('project.import.status.error'));
            toast({
                title: t('project.import.status.error'),
                description: error.message || t('project.import.status.error'),
            });
        }
    };

    // Read file content
    const readFileContent = (file: File): Promise<string> => {
        return new Promise((resolve, reject) => {
          const reader = new FileReader();
      
          reader.onload = () => {
            try {
              const buffer = reader.result as ArrayBuffer;
              const text = new TextDecoder('utf-8', { fatal: false }).decode(buffer);
              resolve(text);
            } catch {
              reject(new Error('Decode failed'));
            }
          };
      
          reader.onerror = () => reject(new Error('Read failed'));
          reader.readAsArrayBuffer(file);
        });
      };

    // Reset import state
    const resetImport = () => {
        setImportedFiles([]);
        setImportStatus('idle');
        setImportMessage('');
        setStats(null);
    };

    // Get file icon
    const getFileIcon = (filename: string) => {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'json') return <FileJson className="h-12 w-12 text-primary" />;
        if (ext === 'csv') return <TableIcon className="h-12 w-12 text-success" />;
        if (ext === 'xml') return <FileText className="h-12 w-12 text-warning" />;
        if (ext === 'yaml' || ext === 'yml') return <FileText className="h-12 w-12 text-accent" />;
        if (ext === 'xlf' || ext === 'xliff') return <FileText className="h-12 w-12 text-blue-500" />;
        if (ext === 'po') return <FileText className="h-12 w-12 text-orange-500" />;
        return <FileText className="h-12 w-12 text-muted-foreground" />;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2 text-foreground">{t('project.import.title')}</h1>
                <p className="text-muted-foreground">
                    {t('project.import.description', { projectName: project?.name })}
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>{t('project.import.fileImport')}</CardTitle>
                    <CardDescription>{t('project.import.fileImportDesc')}</CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="space-y-6">
                        {/* Import method selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('project.import.importMethod')}</label>
                            <RadioGroup
                                defaultValue="append"
                                value={importOption}
                                onValueChange={(value) => setImportOption(value as 'append' | 'replace')}
                                className="flex space-x-4"
                            >
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="append" id="append" />
                                    <label htmlFor="append" className="text-sm">{t('project.import.appendMode')}</label>
                                </div>
                                <div className="flex items-center space-x-2">
                                    <RadioGroupItem value="replace" id="replace" />
                                    <label htmlFor="replace" className="text-sm">{t('project.import.replaceMode')}</label>
                                </div>
                            </RadioGroup>
                        </div>

                        {/* Target language selection */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium">{t('project.import.targetLanguage')}</label>
                            <Select
                                value={selectedLanguage}
                                onValueChange={setSelectedLanguage}
                            >
                                <SelectTrigger className="w-full">
                                    <SelectValue placeholder={t('project.import.selectTargetLanguage')} />
                                </SelectTrigger>
                                <SelectContent>
                                    {project?.languages?.map(lang => (
                                        <SelectItem key={lang} value={lang}>
                                            {formatLanguageDisplay(lang, project?.languageLabels)}
                                        </SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                        </div>

                        {/* Drag and drop area */}
                        <div
                            {...getRootProps()}
                            className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer transition-colors
                                ${isDragActive ? 'border-primary bg-primary/5' : 'border-border hover:border-primary/50'}
                                ${importStatus === 'loading' ? 'opacity-50 pointer-events-none' : ''}
                            `}
                        >
                            <input {...getInputProps()} />
                            {importedFiles.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="flex justify-center">
                                        {getFileIcon(importedFiles[0].name)}
                                    </div>
                                    <p className="font-medium text-foreground">{importedFiles[0].name}</p>
                                    <p className="text-sm text-muted-foreground">
                                        {(importedFiles[0].size / 1024).toFixed(2)} KB
                                    </p>
                                    <Button
                                        variant="outline"
                                        size="sm"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            resetImport();
                                        }}
                                    >
                                        {t('project.import.dragDropArea.chooseAnotherFile')}
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    <div className="flex justify-center">
                                        <Upload className="h-12 w-12 text-muted-foreground" />
                                    </div>
                                    <div>
                                        <p className="font-medium text-foreground">
                                            {isDragActive
                                                ? t('project.import.dragDropArea.dragActive')
                                                : t('project.import.dragDropArea.instructions')}
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            {t('project.import.dragDropArea.supportedFormats')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Import notes */}
                        <div className="bg-muted/50 p-4 rounded-md text-sm border border-border/50">
                            <p className="font-medium mb-2 text-foreground">{t('project.import.importNotes.title')}</p>
                            <ul className="list-disc list-inside space-y-1 text-muted-foreground">
                                <li>{t('project.import.importNotes.jsonNote')}</li>
                                <li>{t('project.import.importNotes.csvNote')}</li>
                                <li>{t('project.import.importNotes.formatNote')}</li>
                                <li>XLIFF files (.xlf) import both source and target language translations</li>
                                <li>Gettext files (.po) import the target language specified in the PO header</li>
                            </ul>
                        </div>

                        {/* Action buttons */}
                        <div className="flex justify-end gap-2">
                            <Button
                                onClick={handleImportClick}
                                disabled={importedFiles.length === 0 || !selectedLanguage || importStatus === 'loading' || isLoadingPreview}
                                className="flex items-center gap-2"
                            >
                                {isLoadingPreview
                                    ? '预览中...'
                                    : importStatus === 'loading'
                                    ? t('project.import.importing')
                                    : t('project.import.importButton')}
                            </Button>
                        </div>

                        {/* Import status message */}
                        {importStatus === 'success' && (
                            <Alert variant="default" className="bg-success/10 border-success/20">
                                <CheckCircle2 className="h-4 w-4 text-success" />
                                <AlertTitle className="text-success">{t('project.import.status.success')}</AlertTitle>
                                <AlertDescription className="text-success/80">
                                    {importMessage}
                                    {stats && (
                                        <div className="mt-2 text-sm">
                                            <p>{t('project.import.stats.total', { total: stats.total })}</p>
                                            <p>{t('project.import.stats.added', { count: stats.added })}</p>
                                            <p>{t('project.import.stats.updated', { count: stats.updated })}</p>
                                            <p>{t('project.import.stats.unchanged', { count: stats.unchanged })}</p>
                                        </div>
                                    )}
                                </AlertDescription>
                            </Alert>
                        )}

                        {importStatus === 'error' && (
                            <Alert variant="destructive">
                                <AlertCircle className="h-4 w-4" />
                                <AlertTitle>{t('project.import.status.error')}</AlertTitle>
                                <AlertDescription>{importMessage}</AlertDescription>
                            </Alert>
                        )}
                    </div>
                </CardContent>
            </Card>

            {/* Preview Dialog */}
            <Dialog open={showPreview} onOpenChange={setShowPreview}>
                <DialogContent className="max-w-4xl h-[90vh] flex flex-col gap-0">
                    <DialogHeader>
                        <DialogTitle>导入预览</DialogTitle>
                        <DialogDescription>
                            查看导入此文件后将发生的变更
                        </DialogDescription>
                    </DialogHeader>
                    
                    {previewChanges && (
                        <>
                            {/* Stats Overview */}
                            <div className="grid grid-cols-4 gap-3 py-4 flex-shrink-0">
                                <div className="p-3 bg-success/10 rounded-lg text-center border border-success/20">
                                    <div className="text-2xl font-bold text-success">
                                        {previewChanges.stats.added}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">新增</div>
                                </div>
                                <div className="p-3 bg-primary/10 rounded-lg text-center border border-primary/20">
                                    <div className="text-2xl font-bold text-primary">
                                        {previewChanges.stats.updated}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">更新</div>
                                </div>
                                <div className="p-3 bg-destructive/10 rounded-lg text-center border border-destructive/20">
                                    <div className="text-2xl font-bold text-destructive">
                                        {previewChanges.stats.deleted}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">删除</div>
                                </div>
                                <div className="p-3 bg-muted/50 rounded-lg text-center border border-border/50">
                                    <div className="text-2xl font-bold text-muted-foreground">
                                        {previewChanges.stats.unchanged}
                                    </div>
                                    <div className="text-xs text-muted-foreground mt-1">未变更</div>
                                </div>
                            </div>

                            {/* Changes Details */}
                            <ScrollArea className="flex-1 border rounded-lg overflow-y-auto">
                                <div className="p-4 space-y-6">
                                        {/* To Add */}
                                        {previewChanges.toAdd.length > 0 && (
                                            <div>
                                                <div className="mb-3">
                                                    <Badge className="bg-success/10 text-success hover:bg-success/10 border border-success/20">
                                                        新增 {previewChanges.toAdd.length} 项
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    {previewChanges.toAdd.map((item, idx) => (
                                                        <div key={idx} className="p-3 bg-success/5 rounded border border-success/20">
                                                            <div className="text-xs text-muted-foreground mb-1 font-mono">{item.key}</div>
                                                            <div className="text-sm text-foreground">{item.translation}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* To Update */}
                                        {previewChanges.toUpdate.length > 0 && (
                                            <div>
                                                <div className="mb-3">
                                                    <Badge className="bg-primary/10 text-primary hover:bg-primary/10 border border-primary/20">
                                                        更新 {previewChanges.toUpdate.length} 项
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    {previewChanges.toUpdate.map((item, idx) => (
                                                        <div key={idx} className="p-3 bg-primary/5 rounded border border-primary/20">
                                                            <div className="text-xs text-muted-foreground mb-2 font-mono">{item.key}</div>
                                                            <div className="space-y-1 text-sm">
                                                                <div className="text-destructive/70 line-through">
                                                                    <span className="font-semibold">- </span>{item.oldTranslation}
                                                                </div>
                                                                <div className="text-success">
                                                                    <span className="font-semibold">+ </span>{item.newTranslation}
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* To Delete */}
                                        {previewChanges.toDelete.length > 0 && (
                                            <div>
                                                <div className="mb-3">
                                                    <Badge className="bg-destructive/10 text-destructive hover:bg-destructive/10 border border-destructive/20">
                                                        删除 {previewChanges.toDelete.length} 项
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    {previewChanges.toDelete.map((item, idx) => (
                                                        <div key={idx} className="p-3 bg-destructive/5 rounded border border-destructive/20">
                                                            <div className="text-xs text-muted-foreground mb-1 font-mono">{item.key}</div>
                                                            <div className="text-sm text-muted-foreground line-through">{item.translation}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}
                                </div>
                            </ScrollArea>
                        </>
                    )}

                    <DialogFooter className="mt-4 flex-shrink-0">
                        <Button variant="outline" onClick={() => setShowPreview(false)}>
                            取消
                        </Button>
                        <Button onClick={handleConfirmedImport}>
                            确认导入
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
}
