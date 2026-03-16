import { Command } from 'commander';
import { ensureProject } from '../guards.js';
import * as fmt from '../formatter.js';

interface SearchResult {
  tokens: Array<{
    id: string;
    key: string;
    module?: string;
    translations?: Record<string, string>;
  }>;
  total: number;
  page: number;
  perPage: number;
  totalPages: number;
}

export const searchCommand = new Command('search')
  .description('Search translation keys and values')
  .argument('<query>', 'Search query')
  .option('--module <module>', 'Filter by module')
  .option('--status <status>', 'Filter by status: all, completed, incomplete', 'all')
  .option('--tags <tags>', 'Filter by tags (comma-separated)')
  .option('--page <page>', 'Page number', '1')
  .action(async (query: string, options: { module?: string; status?: string; tags?: string; page?: string }) => {
    const { client, projectConfig } = await ensureProject();
    const projectId = projectConfig.projectId;

    const params = new URLSearchParams({ q: query });
    if (options.module) params.set('module', options.module);
    if (options.status) params.set('status', options.status);
    if (options.tags) params.set('tags', options.tags);
    if (options.page) params.set('page', options.page);

    const result = await client.get<SearchResult>(
      `/api/tokens/${projectId}/search?${params.toString()}`,
    );

    if (!result.tokens || result.tokens.length === 0) {
      fmt.success(`No tokens found matching '${query}'`);
      fmt.data('result', { tokens: [], total: 0 });
      fmt.flush();
      return;
    }

    // Render table
    const rows = result.tokens.map((t) => {
      const translations = t.translations
        ? Object.entries(t.translations)
            .map(([lang, val]) => `${lang}: ${val}`)
            .join(' | ')
        : '';
      return [t.key, t.module || '—', translations.slice(0, 60) + (translations.length > 60 ? '...' : '')];
    });

    fmt.table(['Key', 'Module', 'Translations'], rows);
    fmt.blank();

    if (result.totalPages > 1) {
      fmt.log(`Showing page ${result.page}/${result.totalPages} (${result.total} total). Use --page ${result.page + 1} to see more.`);
    } else {
      fmt.log(`${result.total} result${result.total !== 1 ? 's' : ''}`);
    }

    fmt.data('result', result);
    fmt.flush();
  });
