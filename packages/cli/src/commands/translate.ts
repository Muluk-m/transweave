import { Command } from 'commander';
import { ensureProject } from '../guards.js';
import { ExitCode } from '../errors.js';
import * as fmt from '../formatter.js';

export const translateCommand = new Command('translate')
  .description('Translate incomplete tokens using AI')
  .option('--dry-run', 'Preview which tokens would be translated without actually translating')
  .action(async (options: { dryRun?: boolean }) => {
    const { client, projectConfig } = await ensureProject();
    const projectId = projectConfig.projectId;

    fmt.log('Checking for untranslated tokens...');

    // Search for incomplete tokens
    const searchResult = await client.get<{
      tokens: Array<{ id: string; key: string; translations: Record<string, string> }>;
      total: number;
    }>(`/api/tokens/${projectId}/search?status=incomplete&perPage=200`);

    if (searchResult.total === 0) {
      fmt.success('All tokens are fully translated');
      fmt.data('result', { translated: 0, total: 0 });
      fmt.flush();
      return;
    }

    fmt.log(`Found ${searchResult.total} tokens with missing translations`);

    if (options.dryRun) {
      fmt.blank();
      for (const token of searchResult.tokens) {
        const missing = Object.entries(token.translations || {})
          .filter(([, v]) => !v?.trim())
          .map(([k]) => k);
        if (missing.length > 0) {
          fmt.log(`  ${token.key}: missing [${missing.join(', ')}]`);
        }
      }
      fmt.blank();
      fmt.success(`Dry run: ${searchResult.total} tokens would be translated`);
      fmt.data('result', { translated: 0, total: searchResult.total, dryRun: true });
      fmt.flush();
      return;
    }

    // Get project info for languages and default lang
    const project = await client.get<{
      languages: string[];
      defaultLang?: string;
    }>(`/api/project/${projectId}`);

    const defaultLang = project.defaultLang || project.languages[0];

    // Build batch request
    const batchTokens = searchResult.tokens
      .map((token) => {
        const filledLangs = project.languages.filter(
          (lang) => token.translations?.[lang]?.trim(),
        );
        const emptyLangs = project.languages.filter(
          (lang) => !token.translations?.[lang]?.trim(),
        );
        if (filledLangs.length === 0 || emptyLangs.length === 0) return null;
        const sourceLang = filledLangs.includes(defaultLang) ? defaultLang : filledLangs[0];
        return {
          id: token.id,
          text: token.translations[sourceLang],
          from: sourceLang,
          to: emptyLangs,
        };
      })
      .filter(Boolean) as Array<{ id: string; text: string; from: string; to: string[] }>;

    if (batchTokens.length === 0) {
      fmt.success('No tokens need translation');
      fmt.data('result', { translated: 0, total: 0 });
      fmt.flush();
      return;
    }

    fmt.log(`Translating ${batchTokens.length} tokens...`);

    // Call batch translate SSE endpoint
    const response = await fetch(
      `${(client as any).baseUrl || ''}/api/ai/batch-translate`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(client as any).authHeaders?.(),
        },
        body: JSON.stringify({ tokens: batchTokens, projectId }),
      },
    );

    if (!response.ok) {
      fmt.log(`Translation API error: ${response.status}`);
      process.exit(ExitCode.ERROR);
    }

    // Process SSE
    const reader = response.body!.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let translated = 0;
    let failed = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        try {
          const event = JSON.parse(line.slice(6));
          if (event.type === 'result' && event.tokenId && event.translations) {
            // Update token on server
            await client.post(`/api/tokens/${event.tokenId}`, {
              translations: event.translations,
            });
            translated++;
            fmt.log(`  [${translated}/${batchTokens.length}] Translated token`);
          } else if (event.type === 'error') {
            failed++;
          }
        } catch {
          // skip
        }
      }
    }

    fmt.blank();
    fmt.success(`Translation complete: ${translated} translated, ${failed} failed`);
    fmt.data('result', { translated, failed, total: batchTokens.length });
    fmt.flush();

    if (failed > 0 && translated > 0) {
      process.exit(ExitCode.PARTIAL_FAILURE);
    } else if (failed > 0) {
      process.exit(ExitCode.ERROR);
    }
  });
