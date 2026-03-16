import { Command } from 'commander';
import { saveProjectConfig } from '../config.js';
import { ensureAuth } from '../guards.js';
import * as fmt from '../formatter.js';

export const initCommand = new Command('init')
  .description('Initialize project config (.transweave.json) in the current directory')
  .option('--project-id <id>', 'Project ID')
  .option('--output-dir <dir>', 'Output directory for translations', './src/locales')
  .option('--format <fmt>', 'Translation file format', 'json')
  .action(async (options: { projectId?: string; outputDir: string; format: string }) => {
    const { client } = await ensureAuth();
    let { projectId, outputDir, format } = options;

    // Interactive mode when project-id is omitted and TTY is available
    if (!projectId && process.stdin.isTTY) {
      const prompts = await import('@clack/prompts');
      prompts.intro('Initialize Project');

      const spinner = prompts.spinner();
      spinner.start('Fetching your projects...');

      const projects = await client.get<Array<{ id: string; name: string; languages?: string[] }>>('/api/project/all');
      spinner.stop('Projects loaded');

      if (!projects || projects.length === 0) {
        fmt.error('No projects found. Create a project in the Transweave Web UI first.');
        process.exit(1);
      }

      const selected = await prompts.select({
        message: 'Select a project',
        options: projects.map((p) => ({
          value: p.id,
          label: `${p.name} (${(p.languages || []).join(', ') || 'no languages'})`,
        })),
      });
      if (prompts.isCancel(selected)) {
        prompts.cancel('Init cancelled.');
        process.exit(0);
      }
      projectId = selected as string;

      const dirResult = await prompts.text({
        message: 'Output directory',
        defaultValue: outputDir,
        placeholder: outputDir,
      });
      if (prompts.isCancel(dirResult)) {
        prompts.cancel('Init cancelled.');
        process.exit(0);
      }
      outputDir = dirResult;

      const fmtResult = await prompts.select({
        message: 'Translation format',
        options: [
          { value: 'json', label: 'JSON' },
          { value: 'yaml', label: 'YAML' },
          { value: 'xliff', label: 'XLIFF' },
          { value: 'po', label: 'Gettext (.po)' },
        ],
      });
      if (prompts.isCancel(fmtResult)) {
        prompts.cancel('Init cancelled.');
        process.exit(0);
      }
      format = fmtResult as string;
    }

    if (!projectId) {
      fmt.error('Missing --project-id flag. Use interactive mode in a terminal or provide the flag.');
      process.exit(1);
    }

    fmt.log(`Fetching project info...`);
    const project = await client.get<{ name: string; languages?: string[] }>(`/api/project/find/${projectId}`);

    if (!project || !project.name) {
      fmt.error('Project not found or invalid response');
      process.exit(1);
    }

    const languages: string[] = project.languages || [];

    await saveProjectConfig({ projectId, outputDir, format, languages });

    fmt.success(`Initialized Transweave config for project: ${project.name}`);
    fmt.info('Project ID', projectId);
    fmt.info('Languages', languages.join(', ') || '(none)');
    fmt.info('Output dir', outputDir);
    fmt.info('Format', format);
    fmt.log('Config saved to .transweave.json');
    fmt.data('project', { id: projectId, name: project.name, languages });
    fmt.data('config', { outputDir, format });
    fmt.flush();
  });
