import {
  renderGlossarySection,
  renderTmSection,
  renderOutputFormat,
} from '../prompts/render';

export interface GlossaryTerm {
  sourceTerm: string;
  translations: Record<string, string>;
  doNotTranslate?: boolean;
}

export interface TmMatch {
  sourceText: string;
  targetText: string;
  targetLanguage: string;
  similarity: number;
}

export function buildTranslationPrompt(
  text: string,
  from: string,
  to: string[],
  options?: {
    glossaryTerms?: GlossaryTerm[];
    tmMatches?: TmMatch[];
  },
): string {
  const lead = `You are a professional translation engine. Translate the following text from the source language to each of the target languages. Maintain the meaning, tone, and formatting as accurately as possible.`;

  return [
    lead,
    ``,
    `Input:`,
    `- Text: "${text}"`,
    `- Source Language (ISO 639-1): ${from}`,
    `- Target Languages (ISO 639-1): [${to.join(', ')}]`,
    renderGlossarySection(options?.glossaryTerms ?? [], to),
    renderTmSection(options?.tmMatches ?? []),
    ``,
    renderOutputFormat(to),
  ].join('\n').trim();
}

export function buildKeyGenerationPrompt(
  remark: string,
  tag?: string,
  module?: string,
): string {
  return `
You're a token key generator for a multilingual system. Based on the input remark, optional tag, and optional module, generate a valid and unique token key following these rules:

Rules:
1. Must start with a lowercase letter
2. Can only include lowercase letters, numbers, dots (.)
3. Use dot (.) to represent hierarchy
4. Must be readable, short, and semantically clear
5. Identical remarks, tags, and modules must generate the same key (idempotent)
6. Key should have at most 3 parts, preferably 2 parts
7. **If module is provided, ALWAYS use it as the first part of the key (e.g., module.action)**
8. If module is not provided but tag is provided, translate tag to English and use it as the first part
9. For Chinese tags, convert to meaningful English equivalents (e.g., 用户 -> user, 认证 -> auth, 通用 -> common)
10. **Output only the token key. No quotes, no Markdown, no code blocks, no explanations**

Format:
Return **only** the token key, nothing else.

Examples:
Remark: 链接, Module: smartShield
Output: smartShield.link

Remark: 预览, Module: smartShield
Output: smartShield.preview

Remark: 用户列表, Module: userCenter
Output: userCenter.userList

Remark: 登录成功, Tag: 认证 (no module)
Output: auth.loginSuccess

Remark: 用户信息, Tag: 用户 (no module)
Output: user.info

Remark: 登录成功 (no tag, no module)
Output: loginSuccess

Now generate a token key for the following:
Remark: ${remark}${module ? `\nModule: ${module}` : ''}${tag ? `\nTag: ${tag}` : ''}
`.trim();
}
