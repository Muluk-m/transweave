"use client";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { nowProjectAtom, nowTeamAtom, projectsAtom, teamsAtom } from "@/jotai";
import { Team } from "@/jotai/types";
import { useAuth } from "@/lib/auth/auth-context";
import { useAtom, useAtomValue } from "jotai";
import {
  ChevronDown,
  ChevronRight,
  Globe,
  Languages,
  LogOut,
  Moon,
  Sun,
  User,
} from "lucide-react";
import Link from "next/link";
import { useRouter, usePathname } from "next/navigation";
import { getUserLanguage, setUserLanguage } from "@/lib/cookies";
import { useTranslations } from "next-intl";
import { useEffect, useState } from "react";

export function HeaderView() {
  const [projects, setProjects] = useAtom(projectsAtom);
  const [teams, setTeams] = useAtom(teamsAtom);
  const [nowTeam, setNowTeam] = useAtom(nowTeamAtom);
  const [nowProject, setNowProject] = useAtom(nowProjectAtom);
  const { user, logout, isLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const t = useTranslations();
  const [isDark, setIsDark] = useState(false);

  // Initialize theme from localStorage
  useEffect(() => {
    const theme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = theme === "dark" || (!theme && prefersDark);
    setIsDark(shouldBeDark);
    document.documentElement.classList.toggle("dark", shouldBeDark);
  }, []);

  const toggleTheme = () => {
    const newTheme = !isDark;
    setIsDark(newTheme);
    localStorage.setItem("theme", newTheme ? "dark" : "light");
    document.documentElement.classList.toggle("dark", newTheme);
  };

  const onNowTeamClick = () => {
    setNowProject(null);
  };

  const handleLogout = () => {
    logout();
    router.push("/");
  };

  const handleLogin = () => {
    router.push("/login");
  };

  const handleTeamSelect = (team: Team) => {
    setNowTeam(team);
    setNowProject(null);
    router.push(`/team/${team.id}`);
  };

  const onHomeBtnClick = () => {
    setNowTeam(null);
    setNowProject(null);
    router.push("/");
  };

  const handleLanguageChange = (locale: string) => {
    setUserLanguage(locale);
    window.dispatchEvent(new Event("storage"));
  };

  const getCurrentLocale = () => {
    return getUserLanguage();
  };

  const currentLocale = getCurrentLocale();

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/80 backdrop-blur-xl supports-[backdrop-filter]:bg-background/60">
      <div className="flex h-16 items-center justify-between px-4 md:px-6 lg:px-8">
        {/* Left: Logo & Breadcrumb */}
        <div className="flex items-center gap-1">
          {/* Logo/Brand */}
          <Button
            onClick={onHomeBtnClick}
            variant="ghost"
            className="flex items-center gap-2 px-3 hover:bg-primary/5 transition-colors"
          >
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-accent shadow-sm">
              <Languages className="h-4 w-4 text-white" />
            </div>
            <span className="font-semibold text-foreground hidden sm:inline-block">
              {t("header.title")}
            </span>
          </Button>

          {/* Breadcrumb Navigation */}
          {!!user && !!nowTeam && (
            <div className="flex items-center animate-fade-in">
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1 px-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors"
                  >
                    <span className="max-w-[120px] truncate">{nowTeam?.name}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 animate-scale-in">
                  {teams.map((team) => (
                    <DropdownMenuItem
                      key={team.id}
                      onClick={() => handleTeamSelect(team)}
                      className={`cursor-pointer ${team.id === nowTeam?.id ? "bg-primary/10 text-primary" : ""}`}
                    >
                      {team.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}

          {!!user && !!nowProject && (
            <div className="flex items-center animate-fade-in">
              <ChevronRight className="h-4 w-4 text-muted-foreground/50" />
              
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    className="flex items-center gap-1 px-2 text-muted-foreground hover:text-foreground hover:bg-primary/5 transition-colors"
                  >
                    <span className="max-w-[120px] truncate">{nowProject?.name}</span>
                    <ChevronDown className="h-3 w-3" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start" className="w-48 animate-scale-in">
                  {projects.map((project) => (
                    <DropdownMenuItem
                      key={project.id}
                      onClick={() => {
                        setNowProject(project);
                        router.push(`/project/${project.id}`);
                      }}
                      className={`cursor-pointer ${project.id === nowProject?.id ? "bg-primary/10 text-primary" : ""}`}
                    >
                      {project.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          )}
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-1">
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            className="rounded-full hover:bg-primary/10 transition-colors"
          >
            {isDark ? (
              <Sun className="h-[1.1rem] w-[1.1rem] text-muted-foreground hover:text-foreground transition-colors" />
            ) : (
              <Moon className="h-[1.1rem] w-[1.1rem] text-muted-foreground hover:text-foreground transition-colors" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>

          {/* Language Switcher */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button 
                variant="ghost" 
                size="icon" 
                className="rounded-full hover:bg-primary/10 transition-colors"
              >
                <Globe className="h-[1.1rem] w-[1.1rem] text-muted-foreground hover:text-foreground transition-colors" />
                <span className="sr-only">{t("header.switchLanguage")}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 animate-scale-in">
              <DropdownMenuItem
                onClick={() => handleLanguageChange("zh-CN")}
                className={`cursor-pointer ${currentLocale === "zh-CN" ? "bg-primary/10 text-primary" : ""}`}
              >
                <span className="mr-2">🇨🇳</span>
                {t("header.languages.chinese")}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => handleLanguageChange("en-US")}
                className={`cursor-pointer ${currentLocale === "en-US" ? "bg-primary/10 text-primary" : ""}`}
              >
                <span className="mr-2">🇺🇸</span>
                {t("header.languages.english")}
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* User Menu */}
          {isLoading ? (
            <div className="flex items-center gap-2 px-3">
              <div className="h-8 w-8 rounded-full bg-muted animate-pulse" />
              <div className="h-4 w-16 rounded bg-muted animate-pulse hidden sm:block" />
            </div>
          ) : user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  className="flex items-center gap-2 px-2 hover:bg-primary/5 transition-colors rounded-full"
                >
                  <Avatar className="h-8 w-8 ring-2 ring-primary/20 transition-all hover:ring-primary/40">
                    <AvatarImage
                      src={user?.avatar || "https://github.com/shadcn.png"}
                      alt={user?.name || "User"}
                    />
                    <AvatarFallback className="bg-gradient-to-br from-primary to-accent text-primary-foreground text-sm">
                      {user?.name?.charAt(0)?.toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <span className="hidden sm:inline-block text-sm font-medium">
                    {user?.name || t("header.user")}
                  </span>
                  <ChevronDown className="h-3 w-3 text-muted-foreground" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 animate-scale-in">
                <div className="px-3 py-2 border-b border-border">
                  <p className="text-sm font-medium">{user?.name}</p>
                  <p className="text-xs text-muted-foreground truncate">{user?.email}</p>
                </div>
                <DropdownMenuItem
                  onClick={() => router.push(`/user/${user.userId}`)}
                  className="cursor-pointer mt-1"
                >
                  <User className="mr-2 h-4 w-4" />
                  <span>{t("header.profile")}</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  onClick={handleLogout}
                  className="cursor-pointer text-destructive focus:text-destructive"
                >
                  <LogOut className="mr-2 h-4 w-4" />
                  <span>{t("header.logout")}</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <Button 
              onClick={handleLogin}
              className="btn-gradient rounded-full px-4"
            >
              <User className="mr-2 h-4 w-4" />
              {t("header.login")}
            </Button>
          )}
        </div>
      </div>
    </header>
  );
}
