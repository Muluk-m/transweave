import { Command } from 'commander';
import { saveGlobalConfig, getGlobalConfigPath } from '../config.js';
import { createApiClient } from '../api-client.js';

export const loginCommand = new Command('login')
  .description('Save server URL and API key to global config')
  .requiredOption('--server <url>', 'Server URL (e.g. http://localhost:3001)')
  .requiredOption('--api-key <key>', 'API key (starts with qlji_)')
  .action(async (options: { server: string; apiKey: string }) => {
    const { server, apiKey } = options;

    if (!apiKey.startsWith('qlji_')) {
      console.error('Error: API key must start with "qlji_"');
      process.exit(1);
    }

    // Validate API key by calling the auth status endpoint
    console.log(`Validating API key against ${server}...`);
    try {
      const client = createApiClient(server, apiKey);
      const result = await client.get('/api/auth/status');

      if (result.status !== 'authenticated') {
        console.error('Error: API key validation failed - server did not confirm authentication');
        process.exit(1);
      }

      // Save to global config
      await saveGlobalConfig({ server, apiKey });

      const configPath = getGlobalConfigPath();
      console.log(`Logged in successfully as ${result.user?.name || result.user?.email || 'user'}.`);
      console.log(`Config saved to ${configPath}`);
    } catch (err: any) {
      console.error(`Error: Failed to validate API key: ${err.message}`);
      process.exit(1);
    }
  });
