"use client";
import { AlertCircle, AlertTriangle, CheckCircle2 } from "lucide-react";
import type { QaIssue } from "@/api/qa-check";

interface QaIssuesDisplayProps {
  issues: QaIssue[];
  passed: boolean;
}

export function QaIssuesDisplay({ issues, passed }: QaIssuesDisplayProps) {
  if (passed) {
    return (
      <div className="flex items-center gap-1.5 text-xs text-green-600 mt-1">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span>QA passed</span>
      </div>
    );
  }

  const errors = issues.filter((i) => i.severity === "error");
  const warnings = issues.filter((i) => i.severity === "warning");

  return (
    <div className="space-y-1 mt-2">
      {errors.map((issue, i) => (
        <div
          key={`e-${i}`}
          className="flex items-start gap-1.5 text-xs text-destructive"
        >
          <AlertCircle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            <span className="font-medium uppercase">[{issue.language}]</span>{" "}
            {issue.message}
          </span>
        </div>
      ))}
      {warnings.map((issue, i) => (
        <div
          key={`w-${i}`}
          className="flex items-start gap-1.5 text-xs text-warning"
        >
          <AlertTriangle className="w-3.5 h-3.5 mt-0.5 shrink-0" />
          <span>
            <span className="font-medium uppercase">[{issue.language}]</span>{" "}
            {issue.message}
          </span>
        </div>
      ))}
    </div>
  );
}
