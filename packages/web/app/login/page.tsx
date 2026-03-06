'use client'

import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Languages, Loader2, Sparkles } from "lucide-react";
import { useTranslations } from "next-intl";
import { useRouter } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";
import { useEffect, useState } from "react";
import { toast } from "@/hooks/use-toast";

export default function LoginPage() {
  const t = useTranslations();
  const router = useRouter();
  const { login, register, isAuthenticated, needsSetup, isLoading: authLoading, error: authError } = useAuth();

  const [isSignUp, setIsSignUp] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [formError, setFormError] = useState<string | null>(null);
  const [isDemoLoading, setIsDemoLoading] = useState(false);

  const handleDemoLogin = async () => {
    setIsDemoLoading(true);
    setFormError(null);
    try {
      await login('admin@test.com', 'admin123456');
      toast({
        title: t("login.demoSuccess.title"),
        description: t("login.demoSuccess.description"),
      });
      router.push('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : t("login.errors.defaultError");
      setFormError(message);
      toast({
        title: t("login.errors.loginFailed"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsDemoLoading(false);
    }
  };

  // Redirect to /setup if first-run setup is needed
  useEffect(() => {
    if (!authLoading && needsSetup) {
      router.push('/setup');
    }
  }, [authLoading, needsSetup, router]);

  // Redirect to /teams if already logged in
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      router.push('/');
    }
  }, [authLoading, isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (isSignUp && !name) {
      setFormError(t("register.errors.requiredFields"));
      return;
    }
    if (!email || !password) {
      setFormError(t("login.errors.requiredFields"));
      return;
    }

    try {
      setIsSubmitting(true);
      if (isSignUp) {
        await register(name, email, password);
        toast({
          title: t("register.success.title"),
          description: t("register.success.description"),
        });
      } else {
        await login(email, password);
        toast({
          title: t("login.success.title"),
          description: t("login.success.description"),
        });
      }
      router.push('/');
    } catch (error) {
      const message = error instanceof Error ? error.message : (
        isSignUp ? t("register.errors.defaultError") : t("login.errors.defaultError")
      );
      setFormError(message);
      toast({
        title: isSignUp ? t("register.errors.registerFailed") : t("login.errors.loginFailed"),
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Show loading while auth state is being determined
  if (authLoading) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 -z-10">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-primary/5 rounded-full blur-3xl" />
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl" />
      </div>

      <Card className="w-full max-w-md border-border/50 shadow-lg">
        <CardHeader className="text-center pb-2">
          {/* Logo */}
          <div className="flex justify-center mb-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-accent shadow-lg shadow-primary/25">
              <Languages className="h-7 w-7 text-white" />
            </div>
          </div>
          <CardTitle className="text-2xl font-bold">
            {isSignUp ? t("register.title") : t("login.title")}
          </CardTitle>
          <CardDescription className="text-muted-foreground">
            {isSignUp ? t("register.description") : t("login.description")}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4 pt-4">
          <form onSubmit={handleSubmit} className="space-y-3">
            {isSignUp && (
              <div>
                <Input
                  placeholder={t("register.placeholders.username")}
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  disabled={isSubmitting}
                />
              </div>
            )}
            <div>
              <Input
                type="email"
                placeholder={t("register.placeholders.email")}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            <div>
              <Input
                type="password"
                placeholder={t("register.placeholders.password")}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isSubmitting}
              />
            </div>
            {formError && (
              <p className="text-sm text-destructive">{formError}</p>
            )}
            <Button
              type="submit"
              className="w-full h-12 rounded-xl font-medium"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  {isSignUp ? t("register.registerInProgress") : t("login.loginInProgress")}
                </>
              ) : (
                isSignUp ? t("register.registerButton") : t("login.loginButton")
              )}
            </Button>
          </form>
          {!isSignUp && (
            <>
              <div className="relative my-1">
                <div className="absolute inset-0 flex items-center">
                  <span className="w-full border-t" />
                </div>
                <div className="relative flex justify-center text-xs uppercase">
                  <span className="bg-card px-2 text-muted-foreground">{t("login.or")}</span>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                className="w-full h-12 rounded-xl font-medium border-primary/30 text-primary hover:bg-primary/5"
                disabled={isSubmitting || isDemoLoading}
                onClick={handleDemoLogin}
              >
                {isDemoLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    {t("login.demoLoading")}
                  </>
                ) : (
                  <>
                    <Sparkles className="mr-2 h-4 w-4" />
                    {t("login.demoButton")}
                  </>
                )}
              </Button>
            </>
          )}
          <div className="mt-4 text-center text-sm text-muted-foreground">
            {isSignUp ? (
              <p>
                {t("register.hasAccount")}{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(false); setFormError(null); }}
                  className="text-primary hover:underline"
                >
                  {t("register.login")}
                </button>
              </p>
            ) : (
              <p>
                {t("login.noAccount")}{' '}
                <button
                  type="button"
                  onClick={() => { setIsSignUp(true); setFormError(null); }}
                  className="text-primary hover:underline"
                >
                  {t("login.register")}
                </button>
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
