'use client'

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import Link from "next/link";
import { ArrowLeft, Loader2, LogIn, Languages, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const feishuClientId = 'cli_a6123d158e73500e';
const feishuState = 'qiliangjia-i18n'

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const { loginWithFeishu } = useAuth();

  const onFeishuLogin = () => {
    const redirectUri = new URL(window.location.href);
    redirectUri.search = ''
    const redirectUriStr = redirectUri.toString();

    window.location.href = `https://accounts.feishu.cn/open-apis/authen/v1/authorize?client_id=${feishuClientId}&redirect_uri=${redirectUriStr}&state=${feishuState}`
  }

  const handleLogin = useCallback(async (code: string) => {
    try {
      setIsLoading(true);
      await loginWithFeishu(code);
      toast({
        title: t("login.success.title"),
        description: t("login.success.description")
      });
      router.push('/teams');
    } catch (error) {
      toast({
        title: t("login.errors.loginFailed"),
        description: error instanceof Error ? error.message : t("login.errors.defaultError"),
        variant: "destructive"
      });
    } finally {
      setIsLoading(false);
    }
  }, [loginWithFeishu, router, t]);

  useEffect(() => {
    const searchParams = new URLSearchParams(window.location.search);
    const code = searchParams.get('code');
    if (code) {
      handleLogin(code);
    }
  }, [handleLogin]);

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <div className="w-full max-w-md mb-6 animate-fade-in">
        <Link href="/">
          <Button variant="ghost" size="sm" className="pl-0 hover:bg-transparent hover:text-primary">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("login.backToHome")}
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md border-border/50 shadow-soft-lg animate-fade-in-up">
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
              <Languages className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">{t("login.title")}</CardTitle>
          <CardDescription className="text-muted-foreground">
            {t("login.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-8">
              <div className="relative">
                <div className="h-12 w-12 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
                <Sparkles className="h-5 w-5 text-primary absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              </div>
              <p className="text-sm text-muted-foreground mt-4">正在登录中...</p>
            </div>
          ) : (
            <div className="space-y-3">
              <Button 
                className="w-full h-12 rounded-xl bg-[#3370ff] hover:bg-[#2860e6] text-white font-medium shadow-lg shadow-[#3370ff]/25 transition-all duration-300 hover:shadow-xl hover:shadow-[#3370ff]/30 hover:-translate-y-0.5" 
                onClick={onFeishuLogin}
              >
                <svg className="mr-2 h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6h-2zm0 8h2v2h-2z"/>
                </svg>
                {t("login.feishuLogin")}
              </Button>
              
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t border-border/50" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">安全登录</span>
                </div>
              </div>
              
              <p className="text-xs text-center text-muted-foreground">
                登录即表示您同意我们的服务条款和隐私政策
              </p>
            </div>
          )}
        </CardContent>
      </Card>
      
      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground animate-fade-in">
        <p>多语言管理平台 - 让国际化更简单</p>
      </div>
    </div>
  );
}
