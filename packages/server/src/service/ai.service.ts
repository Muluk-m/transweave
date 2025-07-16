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

  async generateTokenKey(remark: string, tag?: string) {
    const prompt = `
    You're a token key generator for a multilingual system. Based on the input remark and optional tag, generate a valid and unique token key following these rules:
    
    Rules:
    1. Must start with a lowercase letter
    2. Can only include lowercase letters, numbers, dots (.)
    3. Use dot (.) to represent hierarchy
    4. Must be readable, short, and semantically clear
    5. Identical remarks and tags must generate the same key (idempotent)
    6. Key should have at most 3 parts, preferably 2 parts
    7. If tag is provided, translate it to English and use it as the first part (category) of the key
    8. For Chinese tags, convert to meaningful English equivalents (e.g., 用户 -> user, 认证 -> auth, 通用 -> common)
    9. **Output only the token key. No quotes, no Markdown, no code blocks, no explanations**
    
    Format:
    Return **only** the token key, nothing else.
    
    Examples:
    Remark: 登录成功, Tag: 认证
    Output: auth.loginSuccess
    
    Remark: 用户信息, Tag: 用户
    Output: user.info
    
    Remark: 保存成功, Tag: 通用
    Output: common.saveSuccess
    
    Remark: 数据加载失败, Tag: 接口
    Output: api.loadFailed
    
    Remark: 登录成功 (no tag)
    Output: loginSuccess
    
    Remark: 确认删除此项目？, Tag: 对话框
    Output: dialog.confirmDelete
    
    Remark: 提交表单, Tag: 表单
    Output: form.submit
    
    Remark: 网络错误, Tag: 错误
    Output: error.network
    
    Now generate a token key for the following:
    Remark: ${remark}${tag ? `\nTag: ${tag}` : ''}
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
