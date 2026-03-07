'use client'
import { useState } from "react";
import { Project } from "@/jotai/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Trash, Save, AlertTriangle, Settings, Globe, FileText, Bot, ChevronDown, ChevronRight } from "lucide-react";
import { useTranslations } from "next-intl";
import { formatLanguageDisplay } from "@/constants";
import { LanguageCommandList } from "./LanguageCommandList";
import { deleteProject, updateProject } from "@/api/project";
import { useToast } from "@/components/ui/use-toast";
import { useRouter } from "next/navigation";
import { nowProjectAtom } from "@/jotai";
import { useSetAtom } from "jotai";
import { AiProviderSettings } from "@/components/views/settings/AiProviderSettings";

interface ProjectSettingTabProps {
    project: Project | null;
}

export function ProjectSettingTab({ project }: ProjectSettingTabProps) {
    const t = useTranslations();

    const setNowProject = useSetAtom(nowProjectAtom);
    // Project basic information state
    const [projectName, setProjectName] = useState<string>(project?.name || "");
    const [projectDescription, setProjectDescription] = useState<string>(project?.description || "");
    const [projectUrl, setProjectUrl] = useState<string>(project?.url || "");
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
    const { toast } = useToast();

    // Project language management
    const [projectLanguages, setProjectLanguages] = useState<string[]>(
        project?.languages || ["en"]
    );
    const [projectLanguageLabels, setProjectLanguageLabels] = useState<Record<string, string>>(
        project?.languageLabels || {}
    );

    // Project advanced settings
    const [enableVersioning, setEnableVersioning] = useState<boolean>(
        project?.enableVersioning ?? true
    );

    const router = useRouter()

    // Toggle language (add or remove)
    const handleToggleLanguage = (code: string) => {
        if (code === "en") return;
        if (projectLanguages.includes(code)) {
            setProjectLanguages(projectLanguages.filter(lang => lang !== code));
        } else {
            setProjectLanguages([...projectLanguages, code]);
        }
    };

    // Add custom language
    const handleAddCustomLanguage = (code: string, label: string) => {
        setProjectLanguageLabels({ ...projectLanguageLabels, [code]: label });
        setProjectLanguages([...projectLanguages, code]);
    };

    // Save project settings
    const handleSaveSettings = async () => {
        if (!project) {
            toast({
                title: t('project.settings.error.projectNotFound'),
                description: t('project.settings.error.projectNotFoundDescription'),
                variant: 'destructive'
            });
            return;
        }
        // Set save status to loading
        setSaveStatus("idle");

        // Simulate API request
        try {
            const projectInfo = await updateProject(project?.id, {
                name: projectName,
                url: projectUrl,
                description: projectDescription,
                languages: projectLanguages,
                languageLabels: projectLanguageLabels,
                enableVersioning,
            })

            setNowProject(projectInfo)

            toast({
                title: t('project.settings.saveSuccess'),
            })
            // Set save success
            setSaveStatus("success");

            // Reset status after 3 seconds
            setTimeout(() => setSaveStatus("idle"), 3000);
        } catch (error) {
            // Save failed
            setSaveStatus("error");
        }

    };

    // Delete project
    const handleDeleteProject = async () => {
        if (!project) {
            toast({
                title: t('project.settings.error.projectNotFound'),
                description: t('project.settings.error.projectNotFoundDescription'),
            });
            return;
        }
        // In a real application, this would call an API to delete the project
        await deleteProject(project.id)
        router.push("/projects")
        // Could add navigation logic to project list here
    };

    const sortedLanguages = projectLanguages.sort((a, b) => {
        if (a === "en") return -1;
        if (b === "en") return 1;
        return a.localeCompare(b);
    });

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold mb-2">{t('project.tabs.setting')}</h1>
                <p className="text-gray-600">{t('project.settings.description', { projectName: project?.name })}</p>
            </div>

            <Tabs defaultValue="basic" className="space-y-6">
                <TabsList>
                    <TabsTrigger value="basic" className="flex gap-2 items-center">
                        <FileText className="h-4 w-4" />
                        {t('project.settings.tabs.basic')}
                    </TabsTrigger>
                    <TabsTrigger value="languages" className="flex gap-2 items-center">
                        <Globe className="h-4 w-4" />
                        {t('project.settings.tabs.languages')}
                    </TabsTrigger>
                    <TabsTrigger value="advanced" className="flex gap-2 items-center">
                        <Settings className="h-4 w-4" />
                        {t('project.settings.tabs.advanced')}
                    </TabsTrigger>
                    <TabsTrigger value="ai" className="flex gap-2 items-center">
                        <Bot className="h-4 w-4" />
                        {t('aiSettings.title')}
                    </TabsTrigger>
                    <TabsTrigger value="danger" className="flex gap-2 items-center text-red-500">
                        <AlertTriangle className="h-4 w-4" />
                        {t('project.settings.tabs.danger')}
                    </TabsTrigger>
                </TabsList>

                {/* Basic information settings */}
                <TabsContent value="basic">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('project.settings.basic.title')}</CardTitle>
                            <CardDescription>{t('project.settings.basic.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="projectName">{t('project.settings.basic.name')}</Label>
                                <Input
                                    id="projectName"
                                    value={projectName}
                                    onChange={(e) => setProjectName(e.target.value)}
                                    placeholder={t('project.settings.basic.namePlaceholder')}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="projectDescription">{t('project.settings.basic.description')}</Label>
                                <Textarea
                                    id="projectDescription"
                                    value={projectDescription}
                                    onChange={(e) => setProjectDescription(e.target.value)}
                                    placeholder={t('project.settings.basic.descriptionPlaceholder')}
                                    rows={4}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="projectUrl">{t('project.settings.basic.url')}</Label>
                                <Input
                                    id="projectUrl"
                                    value={projectUrl}
                                    onChange={(e) => setProjectUrl(e.target.value)}
                                    placeholder={t('project.settings.basic.urlPlaceholder')}
                                />
                                <p className="text-sm text-gray-500">{t('project.settings.basic.urlHelpText')}</p>
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <p className="text-sm text-gray-500">
                                {saveStatus === "success" && t('project.settings.saveSuccess')}
                                {saveStatus === "error" && t('project.settings.saveError')}
                            </p>
                            <Button
                                onClick={handleSaveSettings}
                                className="flex items-center gap-2"
                            >
                                <Save className="h-4 w-4" />
                                {t('project.settings.saveButton')}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Language management */}
                <TabsContent value="languages">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('project.settings.languages.title')}</CardTitle>
                            <CardDescription>{t('project.settings.languages.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            {/* Current languages as badges */}
                            <div className="space-y-2">
                                <Label>{t('project.settings.languages.current')}</Label>
                                <div className="flex flex-wrap gap-2">
                                    {sortedLanguages.map(lang => (
                                        <Badge key={lang} variant="outline" className="flex items-center gap-1 py-1.5">
                                            {formatLanguageDisplay(lang, projectLanguageLabels)}
                                            {lang !== "en" && (
                                                <button
                                                    onClick={() => handleToggleLanguage(lang)}
                                                    className="ml-1 text-gray-500 hover:text-red-500"
                                                >
                                                    <Trash className="h-3 w-3" />
                                                </button>
                                            )}
                                        </Badge>
                                    ))}
                                </div>
                                {projectLanguages.length === 0 && (
                                    <p className="text-sm text-gray-500">{t('project.settings.languages.noLanguages')}</p>
                                )}
                            </div>

                            {/* Searchable language command list */}
                            <LanguageCommandList
                                selectedLanguages={projectLanguages}
                                languageLabels={projectLanguageLabels}
                                onToggle={handleToggleLanguage}
                                onAddCustom={handleAddCustomLanguage}
                            />
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <p className="text-sm text-gray-500">
                                {saveStatus === "success" && t('project.settings.languages.saveSuccess')}
                                {saveStatus === "error" && t('project.settings.saveError')}
                            </p>
                            <Button
                                onClick={handleSaveSettings}
                                className="flex items-center gap-2"
                            >
                                <Save className="h-4 w-4" />
                                {t('project.settings.languages.saveButton')}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* Advanced settings */}
                <TabsContent value="advanced">
                    <Card>
                        <CardHeader>
                            <CardTitle>{t('project.settings.advanced.title')}</CardTitle>
                            <CardDescription>{t('project.settings.advanced.description')}</CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <Label htmlFor="autoTranslate" className="font-medium text-muted-foreground">{t('project.settings.advanced.autoTranslate.title')}</Label>
                                    <Badge variant="secondary" className="text-xs">{t('project.settings.advanced.comingSoon')}</Badge>
                                </div>
                                <Switch
                                    id="autoTranslate"
                                    checked={false}
                                    disabled
                                />
                            </div>
                            <p className="text-sm text-gray-500">{t('project.settings.advanced.autoTranslate.description')}</p>

                            <Separator />

                            <div className="flex items-center justify-between">
                                <div>
                                    <Label htmlFor="enableVersioning" className="font-medium">{t('project.settings.advanced.versioning.title')}</Label>
                                    <p className="text-sm text-gray-500">{t('project.settings.advanced.versioning.description')}</p>
                                </div>
                                <Switch
                                    id="enableVersioning"
                                    checked={enableVersioning}
                                    onCheckedChange={setEnableVersioning}
                                />
                            </div>
                        </CardContent>
                        <CardFooter className="flex justify-between">
                            <p className="text-sm text-gray-500">
                                {saveStatus === "success" && t('project.settings.advanced.saveSuccess')}
                                {saveStatus === "error" && t('project.settings.saveError')}
                            </p>
                            <Button
                                onClick={handleSaveSettings}
                                className="flex items-center gap-2"
                            >
                                <Save className="h-4 w-4" />
                                {t('project.settings.advanced.saveButton')}
                            </Button>
                        </CardFooter>
                    </Card>
                </TabsContent>

                {/* AI Settings */}
                <TabsContent value="ai">
                    <div className="space-y-6">
                        {/* Project-level AI config */}
                        {project?.id && (
                            <AiProviderSettings
                                scope="project"
                                scopeId={project.id}
                                projectId={project.id}
                            />
                        )}

                        {/* Team-level AI config (collapsed by default) */}
                        {project?.teamId && (
                            <TeamAiConfigSection teamId={project.teamId} projectId={project.id} />
                        )}
                    </div>
                </TabsContent>

                {/* Danger zone */}
                <TabsContent value="danger">
                    <Card className="border-red-200">
                        <CardHeader className="text-red-500">
                            <CardTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5" />
                                {t('project.settings.danger.title')}
                            </CardTitle>
                            <CardDescription className="text-red-400">
                                {t('project.settings.danger.description')}
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <Alert variant="destructive">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                    {t('project.settings.danger.warning')}
                                </AlertDescription>
                            </Alert>

                            <div className="p-4 border border-red-200 rounded-md">
                                <h3 className="text-lg font-medium text-red-500 mb-2">{t('project.settings.danger.deleteProject')}</h3>
                                <p className="text-sm text-gray-600 mb-4">
                                    {t('project.settings.danger.deleteDescription', { projectName: project?.name })}
                                </p>
                                <AlertDialog>
                                    <AlertDialogTrigger asChild>
                                        <Button variant="destructive" className="flex items-center gap-2">
                                            <Trash className="h-4 w-4" />
                                            {t('project.settings.danger.deleteButton')}
                                        </Button>
                                    </AlertDialogTrigger>
                                    <AlertDialogContent>
                                        <AlertDialogHeader>
                                            <AlertDialogTitle>{t('project.settings.danger.confirmDeleteTitle')}</AlertDialogTitle>
                                            <AlertDialogDescription>
                                                {t('project.settings.danger.confirmDeleteDescription', { projectName: project?.name })}
                                            </AlertDialogDescription>
                                        </AlertDialogHeader>
                                        <AlertDialogFooter>
                                            <AlertDialogCancel>{t('common.cancel')}</AlertDialogCancel>
                                            <AlertDialogAction
                                                onClick={handleDeleteProject}
                                                className="bg-red-500 hover:bg-red-600"
                                            >
                                                {t('project.settings.danger.confirmDeleteButton')}
                                            </AlertDialogAction>
                                        </AlertDialogFooter>
                                    </AlertDialogContent>
                                </AlertDialog>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}

function TeamAiConfigSection({ teamId, projectId }: { teamId: string; projectId: string }) {
    const t = useTranslations();
    const [expanded, setExpanded] = useState(false);

    return (
        <div className="space-y-2">
            <button
                onClick={() => setExpanded(!expanded)}
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors px-1"
            >
                {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                {t('aiSettings.teamDefaultHint')}
            </button>
            {expanded && (
                <AiProviderSettings
                    scope="team"
                    scopeId={teamId}
                    projectId={projectId}
                />
            )}
        </div>
    );
}
