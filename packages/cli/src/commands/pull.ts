import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { ensureProject } from '../guards.js';
import * as fmt from '../formatter.js';

// Dynamic import for jszip (ESM compatibility)
async function loadJSZip(): Promise<typeof import('jszip')> {
  const mod = await import('jszip');
  return mod.default ?? mod;
}

export const pullCommand = new Command('pull')
  .description('Download translations from server to local files')
  .option('--format <fmt>', 'Override output format (json, yaml, csv, xliff, po)')
  .option('--output <dir>', 'Override output directory')
  .option('--languages <langs>', 'Override languages (comma-separated, e.g. en,zh-CN)')
  .option('--module <module>', 'Pull translations for a specific module only')
  .action(async (options: { format?: string; output?: string; languages?: string; module?: string }) => {
    const { client, projectConfig } = await ensureProject();
    const projectId = projectConfig.projectId;
    const format = options.format || projectConfig.format || 'json';
    const outputDir = options.output || projectConfig.outputDir || './src/locales';

    // Fetch project info to get available languages
    const project = await client.get<{ name: string; languages?: string[] }>(`/api/project/find/${projectId}`);
    const projectLanguages: string[] = project.languages || [];

    // Determine which languages to pull
    let languages: string[];
    if (options.languages) {
      languages = options.languages.split(',').map((l: string) => l.trim());
    } else if (projectConfig.languages && projectConfig.languages.length > 0) {
      languages = projectConfig.languages;
    } else {
      languages = projectLanguages;
    }

    if (languages.length === 0) {
      fmt.log('No languages to pull.');
      fmt.data('result', { languages: [], pulled: 0 });
      fmt.flush();
      return;
    }

    // Ensure output directory exists
    await fs.mkdir(outputDir, { recursive: true });

    fmt.log(`Pulling translations for project: ${project.name}`);
    fmt.info('Format', format);
    fmt.info('Languages', languages.join(', '));
    if (options.module) {
      fmt.info('Module', options.module);
    }
    fmt.blank();

    const JSZip = await loadJSZip();
    const results: Array<{ language: string; file: string; status: string }> = [];

    for (const lang of languages) {
      try {
        // Use POST /api/project/export exclusively
        const exportBody: Record<string, any> = {
          format,
          languages: [lang],
          scope: options.module ? 'module' : 'all',
          showEmptyTranslations: true,
          prettify: true,
        };
        if (options.module) {
          exportBody.modules = [options.module];
        }

        const response = await client.getRaw(
          `/api/project/download/${projectId}?format=${format}&languages=${lang}`,
        );

        const buffer = await response.arrayBuffer();
        const zip = await (JSZip as any).loadAsync(buffer);

        const files = Object.keys(zip.files);
        let extracted = false;

        for (const fileName of files) {
          if (zip.files[fileName].dir) continue;
          const content = await zip.files[fileName].async('string');
          const outputPath = path.join(outputDir, `${lang}.${format}`);
          await fs.writeFile(outputPath, content, 'utf-8');
          fmt.log(`  Downloaded ${lang} -> ${outputPath}`);
          results.push({ language: lang, file: outputPath, status: 'ok' });
          extracted = true;
          break;
        }

        if (!extracted) {
          fmt.log(`  Warning: No file found in ZIP for language ${lang}`);
          results.push({ language: lang, file: '', status: 'empty' });
        }
      } catch (err: any) {
        fmt.log(`  Error downloading ${lang}: ${err.message}`);
        results.push({ language: lang, file: '', status: 'error' });
      }
    }

    fmt.blank();
    fmt.success(`Pull complete: ${languages.length} languages processed`);
    fmt.data('result', { languages: results, pulled: results.filter((r) => r.status === 'ok').length });
    fmt.flush();
  });
