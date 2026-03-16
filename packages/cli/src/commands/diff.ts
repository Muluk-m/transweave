import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureProject } from '../guards.js';
import * as fmt from '../formatter.js';

export const diffCommand = new Command('diff')
  .description('Preview what would change if you pushed local translations')
  .option('--format <fmt>', 'Override file format')
  .option('--input <dir>', 'Override input directory')
  .option('--languages <langs>', 'Override languages (comma-separated)')
  .action(async (options: { format?: string; input?: string; languages?: string }) => {
    const { client, projectConfig } = await ensureProject();
    const projectId = projectConfig.projectId;
    const format = options.format || projectConfig.format || 'json';
    const inputDir = options.input || projectConfig.outputDir || './src/locales';

    // Determine languages
    let languages: string[];
    if (options.languages) {
      languages = options.languages.split(',').map((l) => l.trim());
    } else {
      const files = await fs.readdir(inputDir);
      const ext = `.${format}`;
      languages = files
        .filter((f) => f.endsWith(ext))
        .map((f) => f.slice(0, -ext.length));
    }

    if (languages.length === 0) {
      fmt.log(`No translation files found in ${inputDir}`);
      fmt.data('changes', []);
      fmt.flush();
      return;
    }

    let totalChanges = 0;
    const allChanges: Array<{ language: string; changes: any }> = [];

    for (const lang of languages) {
      const filePath = path.join(inputDir, `${lang}.${format}`);

      try {
        const content = await fs.readFile(filePath, 'utf-8');

        const result = await client.post<{ changes?: any; success?: boolean }>(
          `/api/project/import/preview/${projectId}`,
          { language: lang, content, format, mode: 'append' },
        );

        const changes = result.changes || {};
        const added = changes.added || 0;
        const updated = changes.updated || 0;
        const removed = changes.removed || 0;
        const changeCount = added + updated + removed;

        if (changeCount > 0) {
          fmt.log(`${lang}:`);
          if (added > 0) fmt.log(`  + ${added} added`);
          if (updated > 0) fmt.log(`  ~ ${updated} modified`);
          if (removed > 0) fmt.log(`  - ${removed} removed`);
          fmt.blank();
          totalChanges += changeCount;
        }

        allChanges.push({ language: lang, changes });
      } catch (err: any) {
        if (err.code === 'ENOENT' || err.message?.includes('ENOENT')) {
          fmt.log(`Skipped ${lang}: file not found at ${filePath}`);
        } else {
          fmt.log(`Error diffing ${lang}: ${err.message}`);
        }
      }
    }

    if (totalChanges === 0) {
      fmt.success('No changes detected');
    } else {
      fmt.success(`${totalChanges} total changes across ${languages.length} languages`);
    }

    fmt.data('changes', allChanges);
    fmt.data('totalChanges', totalChanges);
    fmt.flush();
  });
