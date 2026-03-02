import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getApiKey, getServer, loadProjectConfig } from '../config.js';
import { createApiClient } from '../api-client.js';

export const pushCommand = new Command('push')
  .description('Upload local translation files to server')
  .option('--format <fmt>', 'Override file format (json, yaml, xliff, po)')
  .option('--input <dir>', 'Override input directory')
  .option('--languages <langs>', 'Override languages (comma-separated, e.g. en,zh-CN)')
  .option('--mode <mode>', 'Import mode: append or replace', 'append')
  .action(async (options: { format?: string; input?: string; languages?: string; mode: string }) => {
    // Load project config
    const projectConfig = await loadProjectConfig();
    if (!projectConfig.projectId) {
      console.error('Error: No project config found. Run "transweave init" first.');
      process.exit(1);
    }

    // Load credentials
    const apiKey = await getApiKey();
    if (!apiKey) {
      console.error('Error: No API key found. Run "transweave login" first.');
      process.exit(1);
    }

    const server = await getServer();
    const client = createApiClient(server, apiKey);

    const projectId = projectConfig.projectId;
    const format = options.format || projectConfig.format || 'json';
    const inputDir = options.input || projectConfig.outputDir || './src/locales';
    const mode = options.mode as 'append' | 'replace';

    try {
      // Determine which languages to push
      let languages: string[];
      if (options.languages) {
        languages = options.languages.split(',').map((l: string) => l.trim());
      } else {
        // Scan input directory for matching files
        const files = await fs.readdir(inputDir);
        const ext = `.${format}`;
        languages = files
          .filter((f) => f.endsWith(ext))
          .map((f) => f.slice(0, -ext.length));
      }

      if (languages.length === 0) {
        console.log(`No translation files found in ${inputDir} with format .${format}`);
        return;
      }

      console.log(`Pushing translations for project: ${projectId}`);
      console.log(`  Format: ${format}`);
      console.log(`  Mode: ${mode}`);
      console.log(`  Languages: ${languages.join(', ')}`);
      console.log('');

      let processedCount = 0;

      for (const lang of languages) {
        const filePath = path.join(inputDir, `${lang}.${format}`);

        try {
          const content = await fs.readFile(filePath, 'utf-8');

          const result = await client.post(`/api/project/import/${projectId}`, {
            language: lang,
            content,
            format,
            mode,
          });

          const stats = result.stats || {};
          console.log(
            `  Pushed ${lang}: ${stats.added || 0} added, ${stats.updated || 0} updated, ${stats.unchanged || 0} unchanged`,
          );
          processedCount++;
        } catch (err: any) {
          if (err.code === 'ENOENT' || err.message?.includes('ENOENT')) {
            console.error(`  Skipped ${lang}: file not found at ${filePath}`);
          } else {
            console.error(`  Error pushing ${lang}: ${err.message}`);
          }
        }
      }

      console.log('');
      console.log(`Push complete: ${processedCount} languages processed`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
