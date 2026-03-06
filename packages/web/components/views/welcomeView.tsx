'use client'

import { Button } from "@/components/ui/button";
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle
} from "@/components/ui/card";
import { LanguageSelector } from "@/components/ui/language-selector";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowRight, Book, Code, Github, Globe2, Layers, Loader2, Lock, Users, Languages, Sparkles, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useRef } from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { toast } from "@/hooks/use-toast";

export default function WelcomeView() {
    const router = useRouter();
    const { login } = useAuth();
    const [isDemoLoading, setIsDemoLoading] = useState(false);
    const t = useTranslations();

    const featuresRef = useRef<HTMLElement>(null);

    const handleGetStarted = () => {
        router.push('/login');
    };

    const handleTutorial = () => {
        router.push('/tutorial');
    };

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

    // 使用i18n获取功能列表
    const features = [
        {
            icon: <Globe2 className="h-6 w-6" />,
            title: t('features.items.0.title'),
            description: t('features.items.0.description'),
            gradient: "from-blue-500 to-cyan-500"
        },
        {
            icon: <Users className="h-6 w-6" />,
            title: t('features.items.1.title'),
            description: t('features.items.1.description'),
            gradient: "from-violet-500 to-purple-500"
        },
        {
            icon: <Layers className="h-6 w-6" />,
            title: t('features.items.2.title'),
            description: t('features.items.2.description'),
            gradient: "from-amber-500 to-orange-500"
        },
        {
            icon: <Code className="h-6 w-6" />,
            title: t('features.items.3.title'),
            description: t('features.items.3.description'),
            gradient: "from-emerald-500 to-teal-500"
        },
        {
            icon: <Lock className="h-6 w-6" />,
            title: t('features.items.4.title'),
            description: t('features.items.4.description'),
            gradient: "from-rose-500 to-pink-500"
        },
        {
            icon: <Github className="h-6 w-6" />,
            title: t('features.items.5.title'),
            description: t('features.items.5.description'),
            gradient: "from-slate-600 to-slate-800"
        }
    ];

    // 工作流程数据从i18n获取 - 修改获取嵌套翻译的方式
    const workflows = [
        {
            title: t('workflow.steps.import.title'),
            description: t('workflow.steps.import.description'),
            steps: [
                t('workflow.steps.import.steps.0'),
                t('workflow.steps.import.steps.1'),
                t('workflow.steps.import.steps.2')
            ]
        },
        {
            title: t('workflow.steps.translate.title'),
            description: t('workflow.steps.translate.description'),
            steps: [
                t('workflow.steps.translate.steps.0'),
                t('workflow.steps.translate.steps.1'),
                t('workflow.steps.translate.steps.2'),
                t('workflow.steps.translate.steps.3')
            ]
        },
        {
            title: t('workflow.steps.export.title'),
            description: t('workflow.steps.export.description'),
            steps: [
                t('workflow.steps.export.steps.0'),
                t('workflow.steps.export.steps.1'),
                t('workflow.steps.export.steps.2')
            ]
        }
    ];

    return (
        <div className="relative overflow-hidden">
            {/* Background decorations */}
            <div className="absolute inset-0 -z-10 overflow-hidden">
                <div className="absolute -top-40 -right-32 w-[500px] h-[500px] bg-primary/5 rounded-full blur-3xl" />
                <div className="absolute top-1/3 -left-32 w-[400px] h-[400px] bg-accent/5 rounded-full blur-3xl" />
                <div className="absolute bottom-0 right-1/4 w-[600px] h-[600px] bg-primary/3 rounded-full blur-3xl" />
            </div>

            <div className="page-container">
                {/* Hero Section */}
                <section className="flex flex-col lg:flex-row items-center justify-between gap-12 py-16 lg:py-24 animate-fade-in-up">
                    <div className="flex-1 space-y-8 text-center lg:text-left">
                        {/* Badge */}
                        <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-4 py-2 text-sm font-medium text-primary border border-primary/20">
                            <Sparkles className="h-4 w-4" />
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
                        
                        {/* CTA Buttons */}
                        <div className="flex flex-wrap gap-4 justify-center lg:justify-start">
                            <Button 
                                size="lg" 
                                onClick={handleGetStarted}
                                className="btn-gradient rounded-xl px-8 h-12 text-base shadow-lg"
                            >
                                {t('welcome.getStarted')}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
                            <Button
                                variant="outline"
                                size="lg"
                                onClick={handleDemoLogin}
                                disabled={isDemoLoading}
                                className="rounded-xl px-8 h-12 text-base border-primary/30 text-primary hover:bg-primary/5"
                            >
                                {isDemoLoading ? (
                                    <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                                ) : (
                                    <Sparkles className="mr-2 h-5 w-5" />
                                )}
                                {t('cta.tryDemo')}
                            </Button>
                        </div>
                        
                        {/* Stats */}
                        <div className="flex gap-8 pt-4 justify-center lg:justify-start">
                            <div className="text-center">
                                <div className="text-3xl font-bold text-foreground">10+</div>
                                <div className="text-sm text-muted-foreground">{t('welcome.stats.languages')}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-foreground">99.9%</div>
                                <div className="text-sm text-muted-foreground">{t('welcome.stats.uptime')}</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-bold text-foreground">24/7</div>
                                <div className="text-sm text-muted-foreground">{t('welcome.stats.support')}</div>
                            </div>
                        </div>
                    </div>
                    
                    {/* Hero Image */}
                    <div className="flex-1 relative w-full max-w-xl lg:max-w-none">
                        <div className="relative h-[400px] lg:h-[500px] w-full overflow-hidden rounded-2xl shadow-soft-lg border border-border/50">
                            <div className="absolute inset-0 bg-gradient-to-br from-primary/30 via-accent/20 to-primary/10"></div>
                        </div>
                        {/* Floating elements */}
                        <div className="absolute -top-4 -left-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-card shadow-soft-lg border border-border/50 animate-fade-in" style={{ animationDelay: '0.2s' }}>
                            <Languages className="h-8 w-8 text-primary" />
                        </div>
                        <div className="absolute -bottom-4 -right-4 flex h-14 w-14 items-center justify-center rounded-xl bg-card shadow-soft-lg border border-border/50 animate-fade-in" style={{ animationDelay: '0.4s' }}>
                            <Zap className="h-7 w-7 text-accent" />
                        </div>
                    </div>
                </section>

                {/* Features Section */}
                <section ref={featuresRef} className="py-20" id="features">
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
                                style={{ animationDelay: `${index * 100}ms` }}
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

                {/* Workflow Section */}
                <section className="py-20">
                    <div className="text-center mb-16">
                        <div className="inline-flex items-center gap-2 rounded-full bg-accent/10 px-4 py-2 text-sm font-medium text-accent border border-accent/20 mb-4">
                            <Book className="h-4 w-4" />
                            {t('workflow.badge')}
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('workflow.title')}</h2>
                        <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                            {t('workflow.description')}
                        </p>
                    </div>

                    <Tabs defaultValue="import" className="max-w-3xl mx-auto">
                        <TabsList className="inline-flex h-auto p-1 bg-muted/50 rounded-xl gap-1 w-full mb-8">
                            <TabsTrigger 
                                value="import"
                                className="flex-1 px-4 py-3 text-sm font-medium rounded-lg
                                    text-muted-foreground hover:text-foreground
                                    data-[state=active]:bg-background data-[state=active]:text-foreground 
                                    data-[state=active]:shadow-sm transition-all duration-200"
                            >
                                {t('workflow.tabs.import')}
                            </TabsTrigger>
                            <TabsTrigger 
                                value="translate"
                                className="flex-1 px-4 py-3 text-sm font-medium rounded-lg
                                    text-muted-foreground hover:text-foreground
                                    data-[state=active]:bg-background data-[state=active]:text-foreground 
                                    data-[state=active]:shadow-sm transition-all duration-200"
                            >
                                {t('workflow.tabs.translate')}
                            </TabsTrigger>
                            <TabsTrigger 
                                value="export"
                                className="flex-1 px-4 py-3 text-sm font-medium rounded-lg
                                    text-muted-foreground hover:text-foreground
                                    data-[state=active]:bg-background data-[state=active]:text-foreground 
                                    data-[state=active]:shadow-sm transition-all duration-200"
                            >
                                {t('workflow.tabs.export')}
                            </TabsTrigger>
                        </TabsList>
                        {workflows.map((workflow, i) => (
                            <TabsContent key={i} value={["import", "translate", "export"][i]} className="animate-fade-in">
                                <Card className="border-border/50 shadow-soft">
                                    <CardHeader>
                                        <CardTitle className="text-xl">{workflow.title}</CardTitle>
                                        <CardDescription className="text-base">
                                            {workflow.description}
                                        </CardDescription>
                                    </CardHeader>
                                    <CardContent>
                                        <ul className="space-y-4">
                                            {workflow.steps.map((step, j) => (
                                                <li key={j} className="flex items-start gap-4">
                                                    <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent text-white text-sm font-medium flex-shrink-0">
                                                        {j+1}
                                                    </span>
                                                    <span className="text-foreground pt-1">{step}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </CardContent>
                                    <CardFooter>
                                        <Button 
                                            onClick={handleTutorial} 
                                            variant="outline" 
                                            className="w-full rounded-xl border-border/50 hover:bg-primary/5 hover:border-primary/30"
                                        >
                                            {t('workflow.viewDocs')}
                                            <ArrowRight className="ml-2 h-4 w-4" />
                                        </Button>
                                    </CardFooter>
                                </Card>
                            </TabsContent>
                        ))}
                    </Tabs>
                </section>

                {/* Case Studies Section */}
                <section className="py-20 relative">
                    <div className="absolute inset-0 bg-gradient-to-b from-muted/30 via-muted/50 to-muted/30 rounded-3xl -z-10" />
                    <div className="px-6 py-12">
                        <div className="text-center mb-16">
                            <h2 className="text-3xl sm:text-4xl font-bold mb-4">{t('cases.title')}</h2>
                            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                                {t('cases.description')}
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-5xl mx-auto">
                            <Card className="group overflow-hidden border-border/50 hover:shadow-soft-lg hover:border-primary/30 transition-all duration-300">
                                <div className="h-48 bg-gradient-to-br from-primary via-violet-500 to-accent relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-xs">SaaS</span>
                                            <span className="px-2 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-xs">{t('cases.tags.multilingual')}</span>
                                        </div>
                                    </div>
                                </div>
                                <CardHeader>
                                    <CardTitle className="group-hover:text-primary transition-colors">{t('cases.case1.title')}</CardTitle>
                                    <CardDescription>{t('cases.case1.subtitle')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {t('cases.case1.quote')}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="ghost" className="px-0 text-primary hover:text-primary/80">
                                        {t('cases.case1.readMore')}
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardFooter>
                            </Card>

                            <Card className="group overflow-hidden border-border/50 hover:shadow-soft-lg hover:border-primary/30 transition-all duration-300">
                                <div className="h-48 bg-gradient-to-br from-amber-400 via-orange-500 to-red-500 relative overflow-hidden">
                                    <div className="absolute inset-0 opacity-20" style={{backgroundImage: 'linear-gradient(rgba(255,255,255,.15) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.15) 1px, transparent 1px)', backgroundSize: '20px 20px'}} />
                                    <div className="absolute bottom-4 left-4 right-4">
                                        <div className="flex gap-2">
                                            <span className="px-2 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-xs">{t('cases.tags.ecommerce')}</span>
                                            <span className="px-2 py-1 rounded-md bg-white/20 backdrop-blur-sm text-white text-xs">{t('cases.tags.i18n')}</span>
                                        </div>
                                    </div>
                                </div>
                                <CardHeader>
                                    <CardTitle className="group-hover:text-primary transition-colors">{t('cases.case2.title')}</CardTitle>
                                    <CardDescription>{t('cases.case2.subtitle')}</CardDescription>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-muted-foreground text-sm leading-relaxed">
                                        {t('cases.case2.quote')}
                                    </p>
                                </CardContent>
                                <CardFooter>
                                    <Button variant="ghost" className="px-0 text-primary hover:text-primary/80">
                                        {t('cases.case2.readMore')}
                                        <ArrowRight className="ml-2 h-4 w-4 group-hover:translate-x-1 transition-transform" />
                                    </Button>
                                </CardFooter>
                            </Card>
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
                            <Sparkles className="h-4 w-4" />
                            {t('cta.badge')}
                        </div>
                        <h2 className="text-3xl sm:text-4xl font-bold mb-6">{t('cta.title')}</h2>
                        <p className="text-xl text-muted-foreground mb-10 max-w-2xl mx-auto">
                            {t('cta.description')}
                        </p>
                        <div className="flex flex-wrap justify-center gap-4">
                            <Button 
                                size="lg" 
                                className="btn-gradient rounded-xl px-8 h-12 text-base shadow-lg" 
                                onClick={handleGetStarted}
                            >
                                {t('cta.register')}
                                <ArrowRight className="ml-2 h-5 w-5" />
                            </Button>
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
                                    <Sparkles className="mr-2 h-5 w-5" />
                                )}
                                {t('cta.tryDemo')}
                            </Button>
                        </div>
                        <p className="text-sm text-muted-foreground mt-6">
                            {t('cta.note')}
                        </p>
                    </div>
                </section>
            </div>
        </div>
    );
}
