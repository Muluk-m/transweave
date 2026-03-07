'use client'

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { ArrowRight, Bot, Check, Code, Copy, FileCode, Github, Loader2, Rocket, Server, Sparkles, Terminal, Users, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useState, useCallback } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "@/hooks/use-toast";

export default function WelcomeView() {
    const router = useRouter();
    const { login } = useAuth();
    const [isDemoLoading, setIsDemoLoading] = useState(false);
    const [copied, setCopied] = useState(false);
    const t = useTranslations();

    const handleDemoLogin = async () => {
        setIsDemoLoading(true);
        try {
            await login('admin@test.com', 'admin123456');
            toast({
                title: t("login.demoSuccess.title"),
                description: t("login.demoSuccess.description"),
            });
            router.push('/');
        } catch {
            router.push('/login');
        } finally {
            setIsDemoLoading(false);
        }
    };

    const handleCopy = useCallback(async (text: string) => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    }, []);

    const features = [
        {
            icon: <Sparkles className="h-6 w-6" />,
            title: t('features.items.aiTranslation.title'),
            description: t('features.items.aiTranslation.description'),
            gradient: "from-violet-500 to-purple-500"
        },
        {
            icon: <Terminal className="h-6 w-6" />,
            title: t('features.items.cliApi.title'),
            description: t('features.items.cliApi.description'),
            gradient: "from-emerald-500 to-teal-500"
        },
        {
            icon: <Bot className="h-6 w-6" />,
            title: t('features.items.mcpIntegration.title'),
            description: t('features.items.mcpIntegration.description'),
            gradient: "from-blue-500 to-cyan-500"
        },
        {
            icon: <FileCode className="h-6 w-6" />,
            title: t('features.items.multiFormat.title'),
            description: t('features.items.multiFormat.description'),
            gradient: "from-amber-500 to-orange-500"
        },
        {
            icon: <Users className="h-6 w-6" />,
            title: t('features.items.teamwork.title'),
            description: t('features.items.teamwork.description'),
            gradient: "from-rose-500 to-pink-500"
        },
        {
            icon: <Server className="h-6 w-6" />,
            title: t('features.items.selfHosted.title'),
            description: t('features.items.selfHosted.description'),
            gradient: "from-slate-500 to-slate-700"
        }
    ];

    const quickstartSteps = [
        {
            title: t('quickstart.steps.deploy.title'),
            description: t('quickstart.steps.deploy.description'),
            command: t('quickstart.steps.deploy.command'),
        },
        {
            title: t('quickstart.steps.configure.title'),
            description: t('quickstart.steps.configure.description'),
        },
        {
            title: t('quickstart.steps.integrate.title'),
            description: t('quickstart.steps.integrate.description'),
            command: t('quickstart.steps.integrate.command'),
        }
    ];

    const integrations = [
        { key: 'cli', icon: <Terminal className="h-5 w-5" /> },
        { key: 'api', icon: <Code className="h-5 w-5" /> },
        { key: 'mcp', icon: <Bot className="h-5 w-5" /> },
        { key: 'cicd', icon: <Rocket className="h-5 w-5" /> },
    ] as const;

    return (
        <div className="relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 -right-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
            </div>

            <div className="page-container">
                {/* Hero Section */}
                <section className="flex flex-col lg:flex-row items-center justify-between gap-12 py-16 lg:py-24 animate-fade-in-up">
                    <div className="flex-1 space-y-8 text-center lg:text-left">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20">
                            <Github className="h-4 w-4" />
                            {t('welcome.tagline')}
                        </div>

                        {/* Title */}
                        <h1 className="text-4xl font-extrabold tracking-tight sm:text-5xl lg:text-6xl">
                            {t.rich('welcome.title', {
                                highlight: (chunks) => (
                                    <span className="text-gradient bg-gradient-to-r from-primary via-accent to-primary bg-[length:200%_auto] animate-shimmer">
                                        {chunks}
                                    </span>
                                )
                            })}
                        </h1>

                        {/* Description */}
                        <p className="text-xl text-muted-foreground max-w-2xl mx-auto lg:mx-0">
                            {t('welcome.description')}
                        </p>

                        {/* Docker Command */}
                        <div className="flex items-center gap-2 max-w-lg mx-auto lg:mx-0">
                            <div className="flex-1 flex items-center gap-3 rounded-xl bg-muted/50 border border-border/50 px-4 py-3 font-mono text-sm">
                                <span className="text-muted-foreground select-none">$</span>
                                <span className="text-foreground">{t('welcome.dockerCommand')}</span>
                            </div>
                            <Button
                                variant="outline"
                                size="icon"
                                className="rounded-xl h-[46px] w-[46px] border-border/50 shrink-0"
                                onClick={() => handleCopy(t('welcome.dockerCommand'))}
                            >
                                {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                            </Button>
                        </div>

                        {/* AI Powered note */}
                        <p className="text-sm text-muted-foreground max-w-lg mx-auto lg:mx-0">
                            <Sparkles className="h-3.5 w-3.5 inline mr-1.5 text-primary" />
                            {t('welcome.aiPowered')}
                        </p>

                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-3 justify-center lg:justify-start">
                            <a
                                href="https://github.com/Muluk-m/transweave"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button
                                    size="lg"
                                    className="btn-gradient rounded-xl px-6 h-11 text-base shadow-lg"
                                >
                                    <Github className="mr-2 h-5 w-5" />
                                    GitHub
                                </Button>
                            </a>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handleDemoLogin}
                                disabled={isDemoLoading}
                                className="rounded-xl px-6 h-11 text-base border-primary/30 text-primary hover:bg-primary/5"
                            >
                                {isDemoLoading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <Zap className="mr-2 h-5 w-5" />
                                )}
                                {t('welcome.tryDemo')}
                            </Button>
                            <Button
                                variant="ghost"
                                size="lg"
                                onClick={() => router.push('/tutorial')}
                                className="rounded-xl px-6 h-11 text-base"
                            >
                                {t('welcome.viewDocs')}
                                <ArrowRight className="ml-2 h-4 w-4" />
                            </Button>
                        </div>
                    </div>

                    {/* Hero Image */}
                    <div className="flex-1 relative w-full max-w-xl lg:max-w-none">
                        <div className="relative w-full overflow-hidden rounded-2xl shadow-soft-lg border border-border/50">
                            <img src="/screenshots/hero-preview.png" alt="Transweave" className="w-full h-auto" />
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section className="py-20" id="features">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20 mb-4">
                            <Zap className="h-4 w-4" />
                            {t('features.badge')}
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('features.title')}</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            {t('features.description')}
                        </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                        {features.map((feature, index) => (
                            <Card
                                key={index}
                                className="group border-border/50 bg-card/50 backdrop-blur-sm hover:shadow-soft-lg hover:border-primary/30 transition-all duration-300 hover:-translate-y-1"
                            >
                                <CardHeader>
                                    <div className={`rounded-xl bg-gradient-to-br ${feature.gradient} w-12 h-12 flex items-center justify-center mb-4 text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                                        {feature.icon}
                                    </div>
                                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-sm leading-relaxed">{feature.description}</p>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </section>

                {/* Quick Start Section */}
                <section className="py-20">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent border border-accent/20 mb-4">
                            <Rocket className="h-4 w-4" />
                            {t('quickstart.badge')}
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('quickstart.title')}</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            {t('quickstart.description')}
                        </p>
                    </div>

                    <div className="max-w-3xl mx-auto space-y-6">
                        {quickstartSteps.map((step, i) => (
                            <div key={i} className="flex items-start gap-6">
                                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-accent text-white text-lg font-bold flex-shrink-0">
                                    {i + 1}
                                </div>
                                <div className="flex-1 space-y-2">
                                    <h3 className="text-lg font-semibold">{step.title}</h3>
                                    <p className="text-muted-foreground text-sm">{step.description}</p>
                                    {step.command && (
                                        <div className="flex items-center gap-2 mt-2">
                                            <code className="flex-1 rounded-lg bg-muted/50 border border-border/50 px-4 py-2.5 font-mono text-sm text-foreground">
                                                <span className="text-muted-foreground mr-2 select-none">$</span>
                                                {step.command}
                                            </code>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="rounded-lg h-9 w-9 shrink-0"
                                                onClick={() => handleCopy(step.command!)}
                                            >
                                                <Copy className="h-3.5 w-3.5" />
                                            </Button>
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </section>

                {/* Integrations Section */}
                <section className="py-20 relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30 rounded-3xl -z-10" />
                    <div className="px-6 py-12">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('integrations.title')}</h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                {t('integrations.description')}
                            </p>
                        </div>

                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 max-w-3xl mx-auto mb-10">
                            {integrations.map((item) => (
                                <Card key={item.key} className="border-border/50 bg-card/80 text-center hover:border-primary/30 transition-colors">
                                    <CardContent className="pt-6 pb-4 px-4">
                                        <div className="flex justify-center mb-3 text-primary">
                                            {item.icon}
                                        </div>
                                        <h3 className="font-semibold text-sm mb-1">{t(`integrations.${item.key}.title`)}</h3>
                                        <p className="text-muted-foreground text-xs leading-relaxed">{t(`integrations.${item.key}.description`)}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>

                        {/* Code examples */}
                        <div className="max-w-2xl mx-auto rounded-xl bg-background border border-border/50 overflow-hidden">
                            <div className="flex items-center gap-2 px-4 py-2.5 border-b border-border/50 bg-muted/30">
                                <div className="flex gap-1.5">
                                    <div className="w-3 h-3 rounded-full bg-red-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                                    <div className="w-3 h-3 rounded-full bg-green-500/60" />
                                </div>
                                <span className="text-xs text-muted-foreground ml-2 font-mono">terminal</span>
                            </div>
                            <pre className="p-4 font-mono text-sm leading-relaxed overflow-x-auto">
                                <code>
                                    <span className="text-muted-foreground">{t('integrations.codeExamples.pull').split('\n')[0]}</span>{'\n'}
                                    <span className="text-green-500">$ </span><span className="text-foreground">{t('integrations.codeExamples.pull').split('\n')[1]}</span>{'\n'}{'\n'}
                                    <span className="text-muted-foreground">{t('integrations.codeExamples.push').split('\n')[0]}</span>{'\n'}
                                    <span className="text-green-500">$ </span><span className="text-foreground">{t('integrations.codeExamples.push').split('\n')[1]}</span>
                                </code>
                            </pre>
                        </div>
                    </div>
                </section>

                {/* CTA Section */}
                <section className="py-24 text-center relative">
                    <div className="absolute inset-0 -z-10">
                        <div className="absolute inset-0 bg-gradient-to-r from-primary/5 via-accent/5 to-primary/5 rounded-3xl" />
                    </div>
                    <div className="max-w-3xl mx-auto px-4">
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20 mb-6">
                            <Rocket className="h-4 w-4" />
                            {t('cta.badge')}
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold mb-6">{t('cta.title')}</h2>
                        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                            {t('cta.description')}
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <a
                                href="https://github.com/Muluk-m/transweave"
                                target="_blank"
                                rel="noopener noreferrer"
                            >
                                <Button
                                    size="lg"
                                    className="btn-gradient rounded-xl px-8 h-12 text-base shadow-lg"
                                >
                                    <Github className="mr-2 h-5 w-5" />
                                    {t('cta.github')}
                                </Button>
                            </a>
                            <Button
                                onClick={handleDemoLogin}
                                disabled={isDemoLoading}
                                variant="outline"
                                size="lg"
                                className="rounded-xl px-8 h-12 text-base border-primary/30 text-primary hover:bg-primary/5"
                            >
                                {isDemoLoading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <Zap className="mr-2 h-5 w-5" />
                                )}
                                {t('cta.tryDemo')}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-6">
                            {t('cta.license')}
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
