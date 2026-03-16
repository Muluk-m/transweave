import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureProject } from '../guards.js';
import { ExitCode } from '../errors.js';
import * as fmt from '../formatter.js';

export const pushCommand = new Command('push')
  .description('Upload local translation files to server')
  .option('--format <fmt>', 'Override file format (json, yaml, xliff, po)')
  .option('--input <dir>', 'Override input directory')
  .option('--languages <langs>', 'Override languages (comma-separated, e.g. en,zh-CN)')
  .option('--mode <mode>', 'Import mode: append or replace', 'append')
  .option('--dry-run', 'Preview changes without actually importing')
  .action(async (options: { format?: string; input?: string; languages?: string; mode: string; dryRun?: boolean }) => {
    const { client, projectConfig } = await ensureProject();
    const projectId = projectConfig.projectId;
    const format = options.format || projectConfig.format || 'json';
    const inputDir = options.input || projectConfig.outputDir || './src/locales';
    const mode = options.mode as 'append' | 'replace';
    const dryRun = options.dryRun || false;

    // Determine which languages to push
    let languages: string[];
    if (options.languages) {
      languages = options.languages.split(',').map((l: string) => l.trim());
    } else {
      const files = await fs.readdir(inputDir);
      const ext = `.${format}`;
      languages = files
        .filter((f) => f.endsWith(ext))
        .map((f) => f.slice(0, -ext.length));
    }

    if (languages.length === 0) {
      fmt.log(`No translation files found in ${inputDir} with format .${format}`);
      fmt.data('result', { languages: [], processed: 0 });
      fmt.flush();
      return;
    }

    const action = dryRun ? 'Previewing' : 'Pushing';
    fmt.log(`${action} translations for project: ${projectId}`);
    fmt.info('Format', format);
    fmt.info('Mode', mode);
    fmt.info('Languages', languages.join(', '));
    if (dryRun) fmt.log('  (dry run — no changes will be applied)');
    fmt.blank();

    let processedCount = 0;
    let errorCount = 0;
    const results: Array<{ language: string; stats?: any; status: string; error?: string }> = [];

    for (const lang of languages) {
      const filePath = path.join(inputDir, `${lang}.${format}`);

      try {
        const content = await fs.readFile(filePath, 'utf-8');
        const endpoint = dryRun
          ? `/api/project/import/preview/${projectId}`
          : `/api/project/import/${projectId}`;

        const body: Record<string, any> = {
          language: lang,
          content,
          format,
          mode,
        };

        const result = await client.post<{ stats?: any; changes?: any; success?: boolean }>(endpoint, body);

        if (dryRun) {
          const changes = result.changes || {};
          fmt.log(`  ${lang}: ${JSON.stringify(changes)}`);
          results.push({ language: lang, stats: changes, status: 'preview' });
        } else {
          const stats = result.stats || {};
          fmt.log(
            `  Pushed ${lang}: ${stats.added || 0} added, ${stats.updated || 0} updated, ${stats.unchanged || 0} unchanged`,
          );
          results.push({ language: lang, stats, status: 'ok' });
        }
        processedCount++;
      } catch (err: any) {
        if (err.code === 'ENOENT' || err.message?.includes('ENOENT')) {
          fmt.log(`  Skipped ${lang}: file not found at ${filePath}`);
          results.push({ language: lang, status: 'skipped', error: 'file not found' });
        } else {
          fmt.log(`  Error pushing ${lang}: ${err.message}`);
          results.push({ language: lang, status: 'error', error: err.message });
          errorCount++;
        }
      }
    }

    fmt.blank();
    const label = dryRun ? 'Dry run' : 'Push';
    fmt.success(`${label} complete: ${processedCount} languages processed`);
    fmt.data('result', { languages: results, processed: processedCount, errors: errorCount, dryRun });
    fmt.flush();

    // Exit code 2 for partial failure
    if (errorCount > 0 && processedCount > 0) {
      process.exit(ExitCode.PARTIAL_FAILURE);
    } else if (errorCount > 0 && processedCount === 0) {
      process.exit(ExitCode.ERROR);
    }
  });
