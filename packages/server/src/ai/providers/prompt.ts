export function buildTranslationPrompt(
  text: string,
  from: string,
  to: string[],
): string {
  return `
You are a professional translation engine. Translate the following text from the source language to each of the target languages. Maintain the meaning, tone, and formatting as accurately as possible.

Input:
- Text: "${text}"
- Source Language (ISO 639-1): ${from}
- Target Languages (ISO 639-1): [${to.join(', ')}]

Output Requirements:
- Only return a valid JSON object as plain text.
- Do not include any comments, explanations, or Markdown code blocks.
- The result must be strictly parsable with JSON.parse() in JavaScript.
- Ensure all characters are properly escaped to conform to JSON syntax.

Output the result in JSON format as:
{
  ${to.map((lang) => `"${lang}": "translated text in ${lang}"`).join(',\n  ')}
}
`.trim();
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
