"use client";
import { useEffect, useRef, useState } from "react";

interface UseTokenKeyboardShortcutsOptions {
  /** Disable shortcuts (e.g. while a drawer is open). */
  disabled?: boolean;
}

/**
 * Lightweight keyboard shortcuts for the Tokens tab:
 * - `/`  focuses the search input
 * - `?`  toggles the cheatsheet overlay
 *
 * Disabled while typing inside an input/textarea/contentEditable so it never
 * fights with regular text entry.
 */
export function useTokenKeyboardShortcuts({
  disabled = false,
}: UseTokenKeyboardShortcutsOptions = {}) {
  const searchInputRef = useRef<HTMLInputElement | null>(null);
  const [cheatsheetOpen, setCheatsheetOpen] = useState(false);

  useEffect(() => {
    if (disabled) return;
    const isEditing = (target: EventTarget | null) => {
      if (!(target instanceof HTMLElement)) return false;
      const tag = target.tagName;
      return (
        tag === "INPUT" ||
        tag === "TEXTAREA" ||
        target.isContentEditable
      );
    };

    const handler = (e: KeyboardEvent) => {
      if (e.metaKey || e.ctrlKey || e.altKey) return;
      if (isEditing(e.target)) return;

      if (e.key === "/") {
        e.preventDefault();
        searchInputRef.current?.focus();
        searchInputRef.current?.select();
        return;
      }
      if (e.key === "?") {
        e.preventDefault();
        setCheatsheetOpen((open) => !open);
        return;
      }
      if (e.key === "Escape" && cheatsheetOpen) {
        setCheatsheetOpen(false);
      }
    };

    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [disabled, cheatsheetOpen]);

  return {
    searchInputRef,
    cheatsheetOpen,
    setCheatsheetOpen,
  };
}
