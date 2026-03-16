import { Command } from 'commander';
import { ensureProject } from '../guards.js';
import { ExitCode } from '../errors.js';
import * as fmt from '../formatter.js';

interface LanguageProgress {
  language: string;
  translated: number;
  total: number;
  percentage: number;
}

export const statusCommand = new Command('status')
  .description('Show translation progress for the current project')
  .option('--fail-under <percentage>', 'Exit with code 1 if overall coverage is below this threshold')
  .action(async (options: { failUnder?: string }) => {
    const { client, projectConfig } = await ensureProject();
    const projectId = projectConfig.projectId;

    const project = await client.get<{ name: string }>(`/api/project/find/${projectId}`);
    const progress = await client.get<LanguageProgress[]>(`/api/tokens/${projectId}/progress`);

    if (!progress || progress.length === 0) {
      fmt.log('No translation keys found in this project.');
      fmt.data('progress', []);
      fmt.flush();
      return;
    }

    fmt.log(`Project: ${project.name}`);
    fmt.blank();

    // Render table
    const rows = progress.map((p) => {
      const pct = p.total > 0 ? Math.round((p.translated / p.total) * 100) : 0;
      const bar = fmt.progressBar(pct / 100);
      return [p.language, `${p.translated}/${p.total}`, `${bar} ${pct}%`];
    });

    fmt.table(['Language', 'Translated', 'Progress'], rows);

    // Overall
    const totalTranslated = progress.reduce((sum, p) => sum + p.translated, 0);
    const totalKeys = progress.reduce((sum, p) => sum + p.total, 0);
    const overall = totalKeys > 0 ? (totalTranslated / totalKeys) * 100 : 0;

    fmt.blank();
    fmt.success(`Overall: ${overall.toFixed(1)}%`);

    fmt.data('progress', progress);
    fmt.data('overall', { translated: totalTranslated, total: totalKeys, percentage: Number(overall.toFixed(1)) });
    fmt.flush();

    // Fail-under threshold
    if (options.failUnder) {
      const threshold = parseFloat(options.failUnder);
      if (overall < threshold) {
        fmt.log(`Coverage ${overall.toFixed(1)}% is below threshold ${threshold}%`);
        process.exit(ExitCode.ERROR);
      }
    }
  });
