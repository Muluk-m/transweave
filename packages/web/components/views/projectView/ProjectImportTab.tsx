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
            'application/xml': ['.xml'],
            'text/yaml': ['.yaml', '.yml'],
        },
        multiple: false
    });

    // Get file format
    const getFileFormat = (filename: string): 'json' | 'csv' | 'xml' | 'yaml' => {
        const ext = filename.split('.').pop()?.toLowerCase();
        if (ext === 'json') return 'json';
        if (ext === 'csv') return 'csv';
        if (ext === 'xml') return 'xml';
        if (ext === 'yaml' || ext === 'yml') return 'yaml';
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
        if (ext === 'json') return <FileJson className="h-12 w-12 text-blue-500" />;
        if (ext === 'csv') return <TableIcon className="h-12 w-12 text-green-500" />;
        if (ext === 'xml') return <FileText className="h-12 w-12 text-orange-500" />;
        if (ext === 'yaml' || ext === 'yml') return <FileText className="h-12 w-12 text-purple-500" />;
        return <FileText className="h-12 w-12 text-gray-500" />;
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2">{t('project.import.title')}</h1>
                <p className="text-gray-600">
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
                                ${isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400'}
                                ${importStatus === 'loading' ? 'opacity-50 pointer-events-none' : ''}
                            `}
                        >
                            <input {...getInputProps()} />
                            {importedFiles.length > 0 ? (
                                <div className="space-y-2">
                                    <div className="flex justify-center">
                                        {getFileIcon(importedFiles[0].name)}
                                    </div>
                                    <p className="font-medium">{importedFiles[0].name}</p>
                                    <p className="text-sm text-gray-500">
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
                                        <Upload className="h-12 w-12 text-gray-400" />
                                    </div>
                                    <div>
                                        <p className="font-medium">
                                            {isDragActive
                                                ? t('project.import.dragDropArea.dragActive')
                                                : t('project.import.dragDropArea.instructions')}
                                        </p>
                                        <p className="text-sm text-gray-500">
                                            {t('project.import.dragDropArea.supportedFormats')}
                                        </p>
                                    </div>
                                </div>
                            )}
                        </div>

                        {/* Import notes */}
                        <div className="bg-gray-50 p-4 rounded-md text-sm">
                            <p className="font-medium mb-2">{t('project.import.importNotes.title')}</p>
                            <ul className="list-disc list-inside space-y-1 text-gray-600">
                                <li>{t('project.import.importNotes.jsonNote')}</li>
                                <li>{t('project.import.importNotes.csvNote')}</li>
                                <li>{t('project.import.importNotes.formatNote')}</li>
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
                            <Alert variant="default" className="bg-green-50 border-green-200">
                                <CheckCircle2 className="h-4 w-4 text-green-500" />
                                <AlertTitle>{t('project.import.status.success')}</AlertTitle>
                                <AlertDescription>
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
                                <div className="p-3 bg-green-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-green-600">
                                        {previewChanges.stats.added}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">新增</div>
                                </div>
                                <div className="p-3 bg-blue-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-blue-600">
                                        {previewChanges.stats.updated}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">更新</div>
                                </div>
                                <div className="p-3 bg-red-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-red-600">
                                        {previewChanges.stats.deleted}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">删除</div>
                                </div>
                                <div className="p-3 bg-gray-50 rounded-lg text-center">
                                    <div className="text-2xl font-bold text-gray-600">
                                        {previewChanges.stats.unchanged}
                                    </div>
                                    <div className="text-xs text-gray-600 mt-1">未变更</div>
                                </div>
                            </div>

                            {/* Changes Details */}
                            <ScrollArea className="flex-1 border rounded-lg overflow-y-auto">
                                <div className="p-4 space-y-6">
                                        {/* To Add */}
                                        {previewChanges.toAdd.length > 0 && (
                                            <div>
                                                <div className="mb-3">
                                                    <Badge className="bg-green-100 text-green-700 hover:bg-green-100">
                                                        新增 {previewChanges.toAdd.length} 项
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    {previewChanges.toAdd.map((item, idx) => (
                                                        <div key={idx} className="p-3 bg-green-50/50 rounded border border-green-200">
                                                            <div className="text-xs text-gray-500 mb-1 font-mono">{item.key}</div>
                                                            <div className="text-sm text-gray-800">{item.translation}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* To Update */}
                                        {previewChanges.toUpdate.length > 0 && (
                                            <div>
                                                <div className="mb-3">
                                                    <Badge className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                                                        更新 {previewChanges.toUpdate.length} 项
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    {previewChanges.toUpdate.map((item, idx) => (
                                                        <div key={idx} className="p-3 bg-blue-50/50 rounded border border-blue-200">
                                                            <div className="text-xs text-gray-500 mb-2 font-mono">{item.key}</div>
                                                            <div className="space-y-1 text-sm">
                                                                <div className="text-red-600/70 line-through">
                                                                    <span className="font-semibold">- </span>{item.oldTranslation}
                                                                </div>
                                                                <div className="text-green-700">
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
                                                    <Badge className="bg-red-100 text-red-700 hover:bg-red-100">
                                                        删除 {previewChanges.toDelete.length} 项
                                                    </Badge>
                                                </div>
                                                <div className="space-y-2">
                                                    {previewChanges.toDelete.map((item, idx) => (
                                                        <div key={idx} className="p-3 bg-red-50/50 rounded border border-red-200">
                                                            <div className="text-xs text-gray-500 mb-1 font-mono">{item.key}</div>
                                                            <div className="text-sm text-gray-600 line-through">{item.translation}</div>
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
