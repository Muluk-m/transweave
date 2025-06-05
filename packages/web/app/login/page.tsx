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
import { ArrowLeft, Loader2, LogIn } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useCallback, useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

const feishuClientId = 'cli_a6123d158e73500e';
const feishuState = 'qiliangjia-i18n'

export default function LoginPage() {
  const t = useTranslations();
  const searchParams = useSearchParams();
  const router = useRouter();
  const code = searchParams.get('code');
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
    if (code) {
      handleLogin(code);
    }
  }, [code, handleLogin]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-muted/30 px-4">

      <div className="w-full max-w-md mb-4">
        <Link href="/">
          <Button variant="ghost" size="sm" className="pl-0">
            <ArrowLeft className="mr-2 h-4 w-4" />
            {t("login.backToHome")}
          </Button>
        </Link>
      </div>

      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl">{t("login.title")}</CardTitle>
          <CardDescription>
            {t("login.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {
            isLoading ?
              <div className="flex justify-center items-center h-full">
                <Loader2 className="h-4 w-4 animate-spin" />
              </div>
              :
              <Button variant="outline" className="w-full bg-[#1e92ff] text-white" onClick={onFeishuLogin}>
                <LogIn className="mr-2 h-4 w-4" />
                {t("login.feishuLogin")}
              </Button>
          }
        </CardContent>

      </Card>
    </div>
  );
}
