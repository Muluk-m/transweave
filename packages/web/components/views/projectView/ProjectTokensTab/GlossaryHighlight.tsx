"use client";

import { useMemo } from "react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

interface GlossaryTerm {
  sourceTerm: string;
  translations: Record<string, string>;
  doNotTranslate: boolean;
  caseSensitive: boolean;
}

interface GlossaryHighlightProps {
  text: string;
  terms: GlossaryTerm[];
  targetLang: string;
}

interface Segment {
  text: string;
  term?: GlossaryTerm;
}

export function GlossaryHighlight({
  text,
  terms,
  targetLang,
}: GlossaryHighlightProps) {
  const segments = useMemo(() => {
    if (!terms.length || !text) return [{ text }] as Segment[];

    // Sort terms by length descending (match longest first)
    const sorted = [...terms].sort(
      (a, b) => b.sourceTerm.length - a.sourceTerm.length
    );

    const result: Segment[] = [];
    let remaining = text;

    while (remaining.length > 0) {
      let found = false;
      for (const term of sorted) {
        const searchText = term.caseSensitive
          ? remaining
          : remaining.toLowerCase();
        const searchTerm = term.caseSensitive
          ? term.sourceTerm
          : term.sourceTerm.toLowerCase();
        const idx = searchText.indexOf(searchTerm);

        if (idx === 0) {
          result.push({
            text: remaining.slice(0, term.sourceTerm.length),
            term,
          });
          remaining = remaining.slice(term.sourceTerm.length);
          found = true;
          break;
        } else if (idx > 0) {
          result.push({ text: remaining.slice(0, idx) });
          result.push({
            text: remaining.slice(idx, idx + term.sourceTerm.length),
            term,
          });
          remaining = remaining.slice(idx + term.sourceTerm.length);
          found = true;
          break;
        }
      }
      if (!found) {
        result.push({ text: remaining });
        break;
      }
    }

    return result;
  }, [text, terms, targetLang]);

  if (!terms.length) {
    return <span>{text}</span>;
  }

  return (
    <TooltipProvider delayDuration={200}>
      <span>
        {segments.map((seg, i) =>
          seg.term ? (
            <Tooltip key={i}>
              <TooltipTrigger asChild>
                <span className="underline decoration-dotted decoration-primary/50 underline-offset-2 cursor-help text-primary/90">
                  {seg.text}
                </span>
              </TooltipTrigger>
              <TooltipContent>
                <div className="text-xs">
                  {seg.term.doNotTranslate ? (
                    <span className="text-warning">Do not translate</span>
                  ) : (
                    <span>
                      {targetLang}:{" "}
                      <strong>
                        {seg.term.translations[targetLang] || "—"}
                      </strong>
                    </span>
                  )}
                </div>
              </TooltipContent>
            </Tooltip>
          ) : (
            <span key={i}>{seg.text}</span>
          )
        )}
      </span>
    </TooltipProvider>
  );
}
