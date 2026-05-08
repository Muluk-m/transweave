"use client";
import { useTranslations } from "next-intl";
import { Badge } from "@/components/ui/badge";
import type { TranslationStatus } from "@/jotai/types";

interface TokenStatusBadgeProps {
  status: TranslationStatus;
  className?: string;
}

export function TokenStatusBadge({ status, className }: TokenStatusBadgeProps) {
  const t = useTranslations("project.status");
  return (
    <Badge
      variant={`status-${status}` as const}
      className={`px-1.5 py-0 rounded-md text-[10px] font-medium uppercase tracking-wide ${className ?? ""}`}
      style={{ letterSpacing: "0.06em" }}
      title={t(`${status}Desc`)}
    >
      {t(status)}
    </Badge>
  );
}
