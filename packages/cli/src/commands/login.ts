import { Command } from 'commander';
import { saveGlobalConfig, getGlobalConfigPath } from '../config.js';
import { createApiClient } from '../api-client.js';
import { AuthError } from '../errors.js';
import * as fmt from '../formatter.js';

export const loginCommand = new Command('login')
  .description('Save server URL and API key to global config')
  .option('--server <url>', 'Server URL (e.g. http://localhost:3001)')
  .option('--api-key <key>', 'API key (starts with tw_)')
  .action(async (options: { server?: string; apiKey?: string }) => {
    let { server, apiKey } = options;

    // Interactive mode when flags are omitted and TTY is available
    if ((!server || !apiKey) && process.stdin.isTTY) {
      const prompts = await import('@clack/prompts');
      prompts.intro('Transweave Login');

      if (!server) {
        const result = await prompts.text({
          message: 'Server URL',
          placeholder: 'http://localhost:3001',
          defaultValue: 'http://localhost:3001',
          validate: (v) => (!v ? 'Server URL is required' : undefined),
        });
        if (prompts.isCancel(result)) {
          prompts.cancel('Login cancelled.');
          process.exit(0);
        }
        server = result;
      }

      if (!apiKey) {
        const result = await prompts.text({
          message: 'API Key (starts with tw_)',
          validate: (v) => {
            if (!v) return 'API key is required';
            if (!v.startsWith('tw_')) return 'API key must start with "tw_"';
            return undefined;
          },
        });
        if (prompts.isCancel(result)) {
          prompts.cancel('Login cancelled.');
          process.exit(0);
        }
        apiKey = result;
      }
    }

    if (!server || !apiKey) {
      throw new AuthError(undefined, 'Missing --server and/or --api-key flags. Use interactive mode in a terminal or provide both flags.');
    }

    if (!apiKey.startsWith('tw_')) {
      throw new AuthError(undefined, 'API key must start with "tw_"');
    }

    fmt.log(`Validating API key against ${server}...`);
    const client = createApiClient(server, apiKey);
    const result = await client.get<{ status: string; user?: { name?: string; email?: string } }>('/api/auth/status');

    if (result.status !== 'authenticated') {
      throw new AuthError('/api/auth/status', 'API key validation failed — server did not confirm authentication');
    }

    await saveGlobalConfig({ server, apiKey });

    const userName = result.user?.name || result.user?.email || 'user';
    fmt.success(`Logged in successfully as ${userName}.`);
    fmt.info('Config saved to', getGlobalConfigPath());
    fmt.data('user', result.user);
    fmt.data('server', server);
    fmt.flush();
  });
