import { Command } from 'commander';
import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import { getApiKey, getServer, loadProjectConfig } from '../config.js';
import { createApiClient } from '../api-client.js';

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
  .action(async (options: { format?: string; output?: string; languages?: string }) => {
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
    const outputDir = options.output || projectConfig.outputDir || './src/locales';

    try {
      // Fetch project info to get available languages
      const project = await client.get(`/api/project/find/${projectId}`);
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
        console.log('No languages to pull.');
        return;
      }

      // Ensure output directory exists
      await fs.mkdir(outputDir, { recursive: true });

      console.log(`Pulling translations for project: ${project.name}`);
      console.log(`  Format: ${format}`);
      console.log(`  Languages: ${languages.join(', ')}`);
      console.log('');

      // Download each language separately
      const JSZip = await loadJSZip();

      for (const lang of languages) {
        try {
          const response = await client.getRaw(
            `/api/project/download/${projectId}?format=${format}&languages=${lang}`,
          );

          // The download endpoint returns a ZIP file
          const buffer = await response.arrayBuffer();
          const zip = await (JSZip as any).loadAsync(buffer);

          // Find the file for this language in the ZIP
          const files = Object.keys(zip.files);
          let extracted = false;

          for (const fileName of files) {
            if (zip.files[fileName].dir) continue;

            const content = await zip.files[fileName].async('string');
            const outputPath = path.join(outputDir, `${lang}.${format}`);
            await fs.writeFile(outputPath, content, 'utf-8');
            console.log(`  Downloaded ${lang} -> ${outputPath}`);
            extracted = true;
            break; // Take the first file (should be the only one for single-language export)
          }

          if (!extracted) {
            console.log(`  Warning: No file found in ZIP for language ${lang}`);
          }
        } catch (err: any) {
          // If the download endpoint requires auth differently, try the export endpoint
          try {
            const exportResult = await client.post(`/api/project/export/${projectId}`, {
              format,
              languages: [lang],
              scope: 'all',
              showEmptyTranslations: true,
              prettify: true,
            });

            // export endpoint also returns a ZIP buffer
            const buffer = typeof exportResult === 'string'
              ? Buffer.from(exportResult, 'base64')
              : Buffer.from(await exportResult.arrayBuffer());
            const zip = await (JSZip as any).loadAsync(buffer);

            const files = Object.keys(zip.files);
            for (const fileName of files) {
              if (zip.files[fileName].dir) continue;
              const content = await zip.files[fileName].async('string');
              const outputPath = path.join(outputDir, `${lang}.${format}`);
              await fs.writeFile(outputPath, content, 'utf-8');
              console.log(`  Downloaded ${lang} -> ${outputPath}`);
              break;
            }
          } catch (exportErr: any) {
            console.error(`  Error downloading ${lang}: ${err.message}`);
          }
        }
      }

      console.log('');
      console.log(`Pull complete: ${languages.length} languages processed`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
