import { Command } from 'commander';
import { getApiKey, getServer, saveProjectConfig } from '../config.js';
import { createApiClient } from '../api-client.js';

export const initCommand = new Command('init')
  .description('Initialize project config (.qlj-i18n.json) in the current directory')
  .requiredOption('--project-id <id>', 'Project ID')
  .option('--output-dir <dir>', 'Output directory for translations', './src/locales')
  .option('--format <fmt>', 'Translation file format', 'json')
  .action(async (options: { projectId: string; outputDir: string; format: string }) => {
    const { projectId, outputDir, format } = options;

    // Load credentials
    const apiKey = await getApiKey();
    if (!apiKey) {
      console.error('Error: No API key found. Run "qlj-i18n login" first.');
      process.exit(1);
    }

    const server = await getServer();

    // Validate project exists
    console.log(`Fetching project info from ${server}...`);
    try {
      const client = createApiClient(server, apiKey);
      const project = await client.get(`/api/project/find/${projectId}`);

      if (!project || !project.name) {
        console.error('Error: Project not found or invalid response');
        process.exit(1);
      }

      // Extract languages from project
      const languages: string[] = project.languages || [];

      // Save project config
      await saveProjectConfig({
        projectId,
        outputDir,
        format,
        languages,
      });

      console.log(`Initialized qlj-i18n config for project: ${project.name}`);
      console.log(`  Project ID: ${projectId}`);
      console.log(`  Languages: ${languages.join(', ') || '(none)'}`);
      console.log(`  Output dir: ${outputDir}`);
      console.log(`  Format: ${format}`);
      console.log(`  Config saved to .qlj-i18n.json`);
    } catch (err: any) {
      console.error(`Error: ${err.message}`);
      process.exit(1);
    }
  });
