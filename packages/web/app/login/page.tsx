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
import { useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const { login } = useAuth();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email || !password) {
      toast({
        title: t("login.errors.requiredFields"),
        variant: "destructive"
      });
      return;
    }
    try {
      setIsLoading(true);
      await login(email, password);
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
  };

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
              <p className="text-sm text-muted-foreground mt-4">{t("login.loginInProgress")}</p>
            </div>
          ) : (
            <form onSubmit={handleLogin} className="space-y-3">
              <div>
                <input
                  type="email"
                  placeholder={t("login.email")}
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full h-12 rounded-xl border border-border/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <div>
                <input
                  type="password"
                  placeholder={t("login.password")}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full h-12 rounded-xl border border-border/50 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-primary/20"
                />
              </div>
              <Button
                type="submit"
                className="w-full h-12 rounded-xl font-medium shadow-lg transition-all duration-300 hover:shadow-xl hover:-translate-y-0.5"
              >
                <LogIn className="mr-2 h-5 w-5" />
                {t("login.loginButton")}
              </Button>

              <p className="text-xs text-center text-muted-foreground pt-2">
                {t("login.noAccount")} <Link href="/register" className="text-primary hover:underline">{t("login.register")}</Link>
              </p>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Footer */}
      <div className="mt-8 text-center text-sm text-muted-foreground animate-fade-in">
        <p>{t("login.description")}</p>
      </div>
    </div>
  );
}
