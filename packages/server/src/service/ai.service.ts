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

  async generateTokenKey(remark: string) {
    const prompt = `
    You're a token key generator for a multilingual system. Based on the input remark, generate a valid and unique token key following these rules:

    Rules:
    1. Must start with a lowercase letter
    2. Can only include lowercase letters, numbers, dots (.) and underscores (_)
    3. Use dot (.) to represent hierarchy — e.g., module.action.status
    4. Must be readable, short, and semantically clear
    5. Identical remarks must generate the same key (idempotent)
    6. Key should be clear, concise, and reflect the meaning of the remark
    7. **Output only the token key. No quotes, no Markdown, no code blocks, no explanations**

    Format:
    Return **only** the token key, nothing else.

    Examples:
    Remark: 登录成功  
    Output: loginSuccess

    Remark: 用户中心 - 登录成功  
    Output: userCenter.login.success

    Now generate a token key for the following remark:

    Remark: {${remark}}
    `

    return this.callDify(prompt);
  }

  async callDify(query: string, systemMessage?: string) {
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
