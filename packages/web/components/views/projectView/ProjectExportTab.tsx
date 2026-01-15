"use client";
import { useState } from "react";
import { Project } from "@/jotai/types";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  CheckCircle2,
  FileJson,
  FileText,
  Table as TableIcon,
  Download,
  Settings2,
} from "lucide-react";
import { formatLanguageDisplay } from "@/constants";
import { exportProjectTokens } from "@/api/project";
import { useTranslations } from "next-intl";

interface ProjectExportTabProps {
  project: Project | null;
}

export function ProjectExportTab({ project }: ProjectExportTabProps) {
  const t = useTranslations("project.export");

  // File format selection
  const [fileFormat, setFileFormat] = useState<string>("json");
  // Export scope
  const [exportScope, setExportScope] = useState<string>("all");
  // Export status
  const [exportStatus, setExportStatus] = useState<"idle" | "success">("idle");
  // Advanced settings
  const [showEmptyTranslations, setShowEmptyTranslations] =
    useState<boolean>(true);
  const [prettify, setPrettify] = useState<boolean>(true);
  const [includeMetadata, setIncludeMetadata] = useState<boolean>(false);
  // Language selection
  const [selectedLanguages, setSelectedLanguages] = useState<string[]>([]);

  // Project languages mock
  const projectLanguages = project?.languages || [];

  // Handle language selection
  const toggleLanguage = (language: string) => {
    if (selectedLanguages.includes(language)) {
      setSelectedLanguages(
        selectedLanguages.filter((lang) => lang !== language)
      );
    } else {
      setSelectedLanguages([...selectedLanguages, language]);
    }
  };

  // Handle download
  const handleExport = async () => {
    if (!project?.id) return;

    setExportStatus("idle");

    try {
      // Call API to export file
      const response = await exportProjectTokens(project.id, {
        format: fileFormat as "json" | "csv" | "xml" | "yaml",
        scope: exportScope as "all" | "completed" | "incomplete" | "custom",
        languages: selectedLanguages.length ? selectedLanguages : undefined,
        showEmptyTranslations,
        prettify,
        includeMetadata,
      });

      // Create download link
      const url = window.URL.createObjectURL(
        new Blob([response as string | ArrayBuffer])
      );
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", `${project.name || "translations"}.zip`); // Change to .zip extension
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      // Update status to success
      setExportStatus("success");

      // Reset status
      setTimeout(() => {
        setExportStatus("idle");
      }, 3000);
    } catch (error) {
      console.error("Export failed:", error);
      // Error handling logic can be added here
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold mb-2 text-foreground">{t("title")}</h1>
        <p className="text-muted-foreground">
          {t("description", { projectName: project?.name })}
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{t("settings")}</CardTitle>
          <CardDescription>{t("settingsDesc")}</CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="format" className="space-y-6">
            <TabsList>
              <TabsTrigger value="format" className="flex items-center gap-2">
                <FileJson className="h-4 w-4" />
                {t("fileFormat")}
              </TabsTrigger>
              <TabsTrigger value="content" className="flex items-center gap-2">
                <Settings2 className="h-4 w-4" />
                {t("contentSettings")}
              </TabsTrigger>
            </TabsList>

            <TabsContent value="format" className="space-y-6">
              {/* File format selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  {t("formatLabel")}
                </label>

                <RadioGroup
                  value={fileFormat}
                  onValueChange={setFileFormat}
                  className="grid grid-cols-2 gap-4 pt-2"
                >
                  <Label
                    htmlFor="json"
                    className={`flex flex-col items-center space-y-2 border rounded-md p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      fileFormat === "json" ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <FileJson className="h-8 w-8 text-primary" />
                    <RadioGroupItem
                      value="json"
                      id="json"
                      className="sr-only"
                    />
                    <div className="font-medium text-foreground">{t("jsonFormat")}</div>
                    <span className="text-xs text-muted-foreground">
                      {t("jsonDesc")}
                    </span>
                  </Label>

                  <Label
                    htmlFor="csv"
                    className={`flex flex-col items-center space-y-2 border rounded-md p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      fileFormat === "csv" ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <TableIcon className="h-8 w-8 text-success" />
                    <RadioGroupItem value="csv" id="csv" className="sr-only" />
                    <div className="font-medium text-foreground">{t("csvFormat")}</div>
                    <span className="text-xs text-muted-foreground">
                      {t("csvDesc")}
                    </span>
                  </Label>

                  <Label
                    htmlFor="xml"
                    className={`flex flex-col items-center space-y-2 border rounded-md p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      fileFormat === "xml" ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <FileText className="h-8 w-8 text-warning" />
                    <RadioGroupItem value="xml" id="xml" className="sr-only" />
                    <div className="font-medium text-foreground">{t("xmlFormat")}</div>
                    <span className="text-xs text-muted-foreground">
                      {t("xmlDesc")}
                    </span>
                  </Label>

                  <Label
                    htmlFor="yaml"
                    className={`flex flex-col items-center space-y-2 border rounded-md p-4 cursor-pointer transition-colors hover:bg-muted/50 ${
                      fileFormat === "yaml" ? "border-primary bg-primary/10" : "border-border"
                    }`}
                  >
                    <FileText className="h-8 w-8 text-accent" />
                    <RadioGroupItem
                      value="yaml"
                      id="yaml"
                      className="sr-only"
                    />
                    <div className="font-medium text-foreground">{t("yamlFormat")}</div>
                    <span className="text-xs text-muted-foreground">
                      {t("yamlDesc")}
                    </span>
                  </Label>
                </RadioGroup>
              </div>

              {/* Export scope selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  {t("exportScope")}
                </label>
                <Select value={exportScope} onValueChange={setExportScope}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select export scope" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t("scopeAll")}</SelectItem>
                    <SelectItem value="completed">
                      {t("scopeCompleted")}
                    </SelectItem>
                    <SelectItem value="incomplete">
                      {t("scopeIncomplete")}
                    </SelectItem>
                    <SelectItem value="custom">{t("scopeCustom")}</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </TabsContent>

            <TabsContent value="content" className="space-y-6">
              {/* Language selection */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  {t("exportLanguages")}
                </label>
                <div className="flex flex-wrap gap-2">
                  {projectLanguages.map((lang) => (
                    <Button
                      key={lang}
                      variant={
                        selectedLanguages.includes(lang) ? "default" : "outline"
                      }
                      size="sm"
                      onClick={() => toggleLanguage(lang)}
                    >
                      {formatLanguageDisplay(lang, project?.languageLabels)}
                    </Button>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground mt-1">
                  {selectedLanguages.length
                    ? t("languagesSelected", {
                        count: selectedLanguages.length,
                      })
                    : t("noLanguageSelected")}
                </p>
              </div>

              {/* Advanced settings */}
              <div className="space-y-3">
                <label className="text-sm font-medium">
                  {t("advancedOptions")}
                </label>
                <div className="space-y-4">
                      <div className="flex items-center justify-between">
                    <div>
                      <Label
                        htmlFor="empty-translations"
                        className="font-medium text-foreground"
                      >
                        {t("includeEmpty")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("includeEmptyDesc")}
                      </p>
                    </div>
                    <Switch
                      id="empty-translations"
                      checked={showEmptyTranslations}
                      onCheckedChange={setShowEmptyTranslations}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="prettify" className="font-medium text-foreground">
                        {t("prettify")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("prettifyDesc")}
                      </p>
                    </div>
                    <Switch
                      id="prettify"
                      checked={prettify}
                      onCheckedChange={setPrettify}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="metadata" className="font-medium text-foreground">
                        {t("metadata")}
                      </Label>
                      <p className="text-xs text-muted-foreground">
                        {t("metadataDesc")}
                      </p>
                    </div>
                    <Switch
                      id="metadata"
                      checked={includeMetadata}
                      onCheckedChange={setIncludeMetadata}
                    />
                  </div>
                </div>
              </div>
            </TabsContent>
          </Tabs>

          {/* Export button */}
          <div className="flex justify-end mt-8">
            <Button onClick={handleExport} className="flex items-center gap-2">
              <Download className="h-4 w-4" />
              {t("downloadButton")}
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2 text-center">
            {t("fileNote")}
          </p>

          {/* Success notification */}
          {exportStatus === "success" && (
            <Alert
              variant="default"
              className="bg-success/10 border-success/20 mt-4"
            >
              <CheckCircle2 className="h-4 w-4 text-success" />
              <AlertTitle className="text-success">{t("exportSuccess")}</AlertTitle>
              <AlertDescription className="text-success/80">{t("exportSuccessDesc")}</AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
