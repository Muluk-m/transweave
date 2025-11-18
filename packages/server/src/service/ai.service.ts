import { Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { safeParseJson } from 'src/utils/json';

const DIFY_API_URL = 'https://api-ai.qiliangjia.org/v1/chat-messages';
const DIFY_API_KEY = process.env.DIFY_API_KEY || 'app-QFt9YXsFIT9YMeVcvn9muuaR';

@Injectable()
export class AiService {
  constructor(private readonly httpService: HttpService) {}

  async translate({
    text,
    from,
    to,
  }: {
    text: string;
    from: string;
    to: string[];
  }) {
    const prompt = `
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
      "xx": "translated text in xx",
      "yy": "translated text in yy"
    }
    `.trim();

    const response = await this.callDify(prompt);
    let result = safeParseJson(response);

    // 重试一次
    if (!result) {
      const response = await this.callDify(prompt);
      result = safeParseJson(response);
    }

    return result;
  }

  async generateTokenKey(remark: string, tag?: string, module?: string) {
    const prompt = `
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
    `
    return this.callDify(prompt);
}
  async callDify(query: string, systemMessage = '') {
    const fullMessage = `System: ${systemMessage}\n\nUser: ${query}`;
    const body = {
      user: 'review-bot',
      inputs: {},
      query: fullMessage,
    };

    const response = await firstValueFrom(
      this.httpService.post(DIFY_API_URL, body, {
        headers: {
          Authorization: `Bearer ${DIFY_API_KEY}`,
          'Content-Type': 'application/json',
        },
      }),
    );

    return response.data?.answer;
  }
}
