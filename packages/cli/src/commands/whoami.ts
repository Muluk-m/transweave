import { Command } from 'commander';
import { getApiKey, getServer, loadProjectConfig } from '../config.js';
import { createApiClient } from '../api-client.js';
import * as fmt from '../formatter.js';

export const whoamiCommand = new Command('whoami')
  .description('Show current user, server, and project info')
  .action(async () => {
    const apiKey = await getApiKey();
    if (!apiKey) {
      fmt.success('Not logged in. Run `transweave login` to authenticate.');
      fmt.data('authenticated', false);
      fmt.flush();
      return;
    }

    const server = await getServer();
    const client = createApiClient(server, apiKey);

    const result = await client.get<{ status: string; user?: { name?: string; email?: string } }>('/api/auth/status');

    const user = result.user;
    fmt.success(`Logged in as ${user?.name || user?.email || 'unknown'}`);
    fmt.info('Email', user?.email || '(not set)');
    fmt.info('Server', server);

    const projectConfig = await loadProjectConfig();
    if (projectConfig.projectId) {
      try {
        const project = await client.get<{ name: string }>(`/api/project/find/${projectConfig.projectId}`);
        fmt.info('Project', `${project.name} (${projectConfig.projectId})`);
      } catch {
        fmt.info('Project', `${projectConfig.projectId} (could not fetch details)`);
      }
      fmt.info('Output dir', projectConfig.outputDir || './src/locales');
      fmt.info('Format', projectConfig.format || 'json');
    } else {
      fmt.log('  No project configured (run `transweave init`)');
    }

    fmt.data('user', user);
    fmt.data('server', server);
    fmt.data('project', projectConfig.projectId ? projectConfig : null);
    fmt.flush();
  });
