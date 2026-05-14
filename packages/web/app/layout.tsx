import type { Metadata } from "next";
import { NuqsAdapter } from "nuqs/adapters/next/app";
import { AuthProvider } from "@/lib/auth/auth-context";
import "./globals.css";
import { HeaderView } from "@/components/views/headerView";
import { Toaster } from "@/components/ui/toaster";
import { HeaderManager } from "@/components/views/header-manager";
import { SidebarManager } from "@/components/views/sidebar-manager";
import { I18nClientProvider } from "@/components/i18n/client-provider";
import { QueryProvider } from "@/lib/query-client";

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? "https://transweave.dev";

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: "Transweave — Self-hosted i18n management",
    template: "%s · Transweave",
  },
  description:
    "Self-hosted i18n management platform for development teams. Manage multilingual translations with AI, CLI, and team collaboration.",
  keywords: ["i18n", "translation management", "self-hosted", "open source", "localization", "AI translation"],
  alternates: {
    canonical: "/",
  },
  openGraph: {
    title: "Transweave — Self-hosted i18n management",
    description: "Self-hosted i18n management for teams that ship.",
    url: SITE_URL,
    siteName: "Transweave",
    images: [{ url: "/og-image.png", width: 1200, height: 630 }],
    type: "website",
    locale: "en_US",
  },
  twitter: {
    card: "summary_large_image",
    title: "Transweave — Self-hosted i18n management",
    description: "Self-hosted i18n management for teams that ship.",
    images: ["/og-image.png"],
  },
  robots: {
    index: true,
    follow: true,
  },
};

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html suppressHydrationWarning>
      <head>
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-sans/style.min.css"
        />
        <link
          rel="stylesheet"
          href="https://cdn.jsdelivr.net/npm/geist@1.3.1/dist/fonts/geist-mono/style.min.css"
        />
      </head>
      <body className="font-[Geist,system-ui,sans-serif]">
        <NuqsAdapter>
          <QueryProvider>
          <AuthProvider>
            <I18nClientProvider>
              <div className="min-h-screen flex flex-col">
                <HeaderManager>
                  <HeaderView />
                </HeaderManager>
                <div className="flex flex-1 overflow-hidden">
                  <SidebarManager />
                  <main className="flex-1 overflow-y-auto">{children}</main>
                </div>
              </div>
              <div className="fixed top-0 left-0 right-0 z-[100] flex justify-center">
                <Toaster />
              </div>
            </I18nClientProvider>
          </AuthProvider>
          </QueryProvider>
        </NuqsAdapter>
      </body>
    </html>
  );
}
