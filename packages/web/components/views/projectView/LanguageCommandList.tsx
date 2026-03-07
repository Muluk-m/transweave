'use client'

import { useState } from "react"
import { Check, Plus } from "lucide-react"
import { useTranslations } from "next-intl"
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList, CommandSeparator } from "@/components/ui/command"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Languages, formatLanguageDisplay, isBuiltInLanguage } from "@/constants"

const COMMON_LANGUAGE_CODES = ["en", "zh-CN", "zh-TW", "ja", "ko", "fr", "de", "es", "pt", "ru"]

interface LanguageCommandListProps {
    selectedLanguages: string[]
    languageLabels: Record<string, string>
    onToggle: (code: string) => void
    onAddCustom: (code: string, label: string) => void
}

export function LanguageCommandList({
    selectedLanguages,
    languageLabels,
    onToggle,
    onAddCustom,
}: LanguageCommandListProps) {
    const t = useTranslations()
    const [search, setSearch] = useState("")
    const [customLabel, setCustomLabel] = useState("")
    const [showCustomInput, setShowCustomInput] = useState(false)

    const allLanguages = Languages.toSelect().map(({ value, label }) => ({
        code: value,
        label,
    }))

    const commonLanguages = allLanguages.filter(l => COMMON_LANGUAGE_CODES.includes(l.code))
    // Sort common languages by the order defined in COMMON_LANGUAGE_CODES
    commonLanguages.sort((a, b) => COMMON_LANGUAGE_CODES.indexOf(a.code) - COMMON_LANGUAGE_CODES.indexOf(b.code))

    const otherLanguages = allLanguages.filter(l => !COMMON_LANGUAGE_CODES.includes(l.code))

    const hasMatch = allLanguages.some(
        l => l.code.toLowerCase().includes(search.toLowerCase()) || l.label.includes(search)
    )

    const handleCustomAdd = () => {
        if (search && customLabel) {
            onAddCustom(search.trim(), customLabel.trim())
            setSearch("")
            setCustomLabel("")
            setShowCustomInput(false)
        }
    }

    const renderItem = (lang: { code: string; label: string }) => {
        const isSelected = selectedLanguages.includes(lang.code)
        const isEn = lang.code === "en"
        const display = formatLanguageDisplay(lang.code, languageLabels)

        return (
            <CommandItem
                key={lang.code}
                value={lang.code}
                keywords={[lang.label, lang.code]}
                onSelect={() => {
                    if (!isEn) onToggle(lang.code)
                }}
                disabled={isEn}
                className={cn(
                    "flex items-center gap-2",
                    isSelected && "opacity-50",
                    isEn && "cursor-not-allowed"
                )}
            >
                <div className={cn(
                    "flex h-4 w-4 items-center justify-center rounded-sm border",
                    isSelected ? "border-primary bg-primary text-primary-foreground" : "border-muted-foreground/30"
                )}>
                    {isSelected && <Check className="h-3 w-3" />}
                </div>
                <span>{display}</span>
            </CommandItem>
        )
    }

    return (
        <Command className="rounded-lg border" shouldFilter={true}>
            <CommandInput
                placeholder={t('project.settings.languages.searchPlaceholder')}
                value={search}
                onValueChange={setSearch}
            />
            <CommandList className="max-h-[300px]">
                <CommandEmpty>
                    {!showCustomInput ? (
                        <button
                            className="flex items-center gap-2 w-full px-2 py-1.5 text-sm hover:bg-accent rounded-sm cursor-pointer justify-center"
                            onClick={() => setShowCustomInput(true)}
                        >
                            <Plus className="h-4 w-4" />
                            {t('project.settings.languages.addCustom', { code: search })}
                        </button>
                    ) : (
                        <div className="flex items-center gap-2 px-2">
                            <Input
                                value={customLabel}
                                onChange={(e) => setCustomLabel(e.target.value)}
                                placeholder={t('project.settings.languages.customLabelPlaceholder')}
                                className="h-8 text-sm"
                                autoFocus
                                onKeyDown={(e) => {
                                    if (e.key === "Enter") {
                                        e.preventDefault()
                                        handleCustomAdd()
                                    }
                                    if (e.key === "Escape") {
                                        setShowCustomInput(false)
                                        setCustomLabel("")
                                    }
                                }}
                            />
                            <Button
                                size="sm"
                                className="h-8"
                                onClick={handleCustomAdd}
                                disabled={!customLabel.trim()}
                            >
                                {t('common.add')}
                            </Button>
                        </div>
                    )}
                </CommandEmpty>

                <CommandGroup heading={t('project.settings.languages.commonGroup')}>
                    {commonLanguages.map(renderItem)}
                </CommandGroup>

                <CommandSeparator />

                <CommandGroup heading={t('project.settings.languages.allGroup')}>
                    {otherLanguages.map(renderItem)}
                </CommandGroup>

                {/* Custom language option when search has text but matches exist */}
                {search && hasMatch && !isBuiltInLanguage(search) && !selectedLanguages.includes(search) && (
                    <>
                        <CommandSeparator />
                        <CommandGroup>
                            {!showCustomInput ? (
                                <CommandItem
                                    value={`custom-${search}`}
                                    onSelect={() => setShowCustomInput(true)}
                                >
                                    <Plus className="h-4 w-4 mr-2" />
                                    {t('project.settings.languages.addCustom', { code: search })}
                                </CommandItem>
                            ) : (
                                <div className="flex items-center gap-2 px-2 py-1.5">
                                    <Input
                                        value={customLabel}
                                        onChange={(e) => setCustomLabel(e.target.value)}
                                        placeholder={t('project.settings.languages.customLabelPlaceholder')}
                                        className="h-8 text-sm"
                                        autoFocus
                                        onKeyDown={(e) => {
                                            if (e.key === "Enter") {
                                                e.preventDefault()
                                                handleCustomAdd()
                                            }
                                            if (e.key === "Escape") {
                                                setShowCustomInput(false)
                                                setCustomLabel("")
                                            }
                                        }}
                                    />
                                    <Button
                                        size="sm"
                                        className="h-8"
                                        onClick={handleCustomAdd}
                                        disabled={!customLabel.trim()}
                                    >
                                        {t('common.add')}
                                    </Button>
                                </div>
                            )}
                        </CommandGroup>
                    </>
                )}
            </CommandList>
        </Command>
    )
}
