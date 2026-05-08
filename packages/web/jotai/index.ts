import { atom } from "jotai";
import { Project, Team, User } from "./types";

export const nowTeamAtom = atom<Team | null>(null);

export const teamsAtom = atom<Team[]>([]);

export const nowProjectAtom = atom<Project | null>(null);

export const projectsAtom = atom<Project[]>([]);

/**
 * Token-level context handed off to the AgentChat sheet.
 * When set, AgentChat opens (if not already), seeds the conversation with a
 * system-message describing the token, and shows quick-prompt chips.
 *
 * Set from row-level "Ask Agent" buttons in TokenTable / TokenFormDrawer.
 * Cleared when the sheet closes or another token is selected.
 */
export interface AgentChatTokenContext {
  tokenId: string;
  key: string;
  module?: string;
  sourceLang?: string;
  translations: Record<string, string>;
  screenshots: string[];
  /** Monotonic counter so the chat reacts even if the same context is set twice */
  nonce: number;
}

export const agentChatTokenContextAtom = atom<AgentChatTokenContext | null>(null);
