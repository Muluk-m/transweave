'use client'

import { usePathname } from "next/navigation";
import React from "react";
import { useAuth } from "@/lib/auth/auth-context";
import { Globe } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { getUserLanguage, setUserLanguage } from "@/lib/cookies";
import { useTranslations } from "next-intl";

const authPaths = ['/login', '/register', '/signup', '/setup', '/forgot-password', '/reset-password'];

function AuthHeader() {
  const t = useTranslations();
  const currentLocale = getUserLanguage();

  const handleLanguageChange = (locale: string) => {
    setUserLanguage(locale);
    window.dispatchEvent(new Event("storage"));
  };

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl">
      <div className="flex h-16 items-center justify-end px-4 md:px-6 lg:px-8">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full hover:bg-primary/10">
              <Globe className="h-[1.1rem] w-[1.1rem] text-muted-foreground" />
              <span className="sr-only">{t("header.switchLanguage")}</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-40">
            <DropdownMenuItem
              onClick={() => handleLanguageChange("zh-CN")}
              className={`cursor-pointer ${currentLocale === "zh-CN" ? "bg-primary/10 text-primary" : ""}`}
            >
              <span className="mr-2">🇨🇳</span>中文
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => handleLanguageChange("en-US")}
              className={`cursor-pointer ${currentLocale === "en-US" ? "bg-primary/10 text-primary" : ""}`}
            >
              <span className="mr-2">🇺🇸</span>English
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}

export function HeaderManager({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { isAuthenticated } = useAuth();

  const isAuthPage =
    !isAuthenticated ||
    authPaths.some(path => pathname === path || pathname.startsWith(`${path}/`));

  if (isAuthPage) {
    return <AuthHeader />;
  }

  return <>{children}</>;
}
