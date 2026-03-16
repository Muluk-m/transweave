import { getApiKey, getServer, loadProjectConfig, type ProjectConfig } from './config.js';
import { createApiClient, type ApiClient } from './api-client.js';
import { AuthError, TransweaveError } from './errors.js';

export interface AuthContext {
  server: string;
  apiKey: string;
  client: ApiClient;
}

export interface ProjectContext extends AuthContext {
  projectConfig: Required<Pick<ProjectConfig, 'projectId'>> & ProjectConfig;
}

/**
 * Ensure the user is authenticated. Returns server, apiKey, and a ready-to-use client.
 * Throws AuthError if no API key is configured.
 */
export async function ensureAuth(): Promise<AuthContext> {
  const apiKey = await getApiKey();
  if (!apiKey) {
    throw new AuthError(undefined, 'No API key found.');
  }
  const server = await getServer();
  const client = createApiClient(server, apiKey);
  return { server, apiKey, client };
}

/**
 * Ensure auth + project config. Returns everything from ensureAuth plus projectConfig.
 * Throws if no .transweave.json or missing projectId.
 */
export async function ensureProject(): Promise<ProjectContext> {
  const auth = await ensureAuth();
  const projectConfig = await loadProjectConfig();
  if (!projectConfig.projectId) {
    throw new TransweaveError(
      'No project config found.',
      undefined,
      undefined,
      'Run `transweave init` to initialize a project.',
      'NO_PROJECT',
    );
  }
  return {
    ...auth,
    projectConfig: projectConfig as ProjectContext['projectConfig'],
  };
}
