import * as fs from 'node:fs/promises';
import * as path from 'node:path';
import * as os from 'node:os';

export interface GlobalConfig {
  server?: string;
  apiKey?: string;
}

export interface ProjectConfig {
  projectId?: string;
  outputDir?: string;
  format?: string;
  languages?: string[];
}

const CONFIG_DIR = path.join(os.homedir(), '.config', 'transweave');
const GLOBAL_CONFIG_PATH = path.join(CONFIG_DIR, 'config.json');
const PROJECT_CONFIG_FILENAME = '.transweave.json';

/**
 * Load global config from ~/.config/transweave/config.json
 */
export async function loadGlobalConfig(): Promise<GlobalConfig> {
  try {
    const content = await fs.readFile(GLOBAL_CONFIG_PATH, 'utf-8');
    return JSON.parse(content);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return {};
    }
    throw err;
  }
}

/**
 * Save global config to ~/.config/transweave/config.json
 */
export async function saveGlobalConfig(config: GlobalConfig): Promise<void> {
  await fs.mkdir(CONFIG_DIR, { recursive: true });
  await fs.writeFile(GLOBAL_CONFIG_PATH, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Load project config from .transweave.json in the current directory
 */
export async function loadProjectConfig(): Promise<ProjectConfig> {
  const configPath = path.join(process.cwd(), PROJECT_CONFIG_FILENAME);
  try {
    const content = await fs.readFile(configPath, 'utf-8');
    return JSON.parse(content);
  } catch (err: any) {
    if (err.code === 'ENOENT') {
      return {};
    }
    throw err;
  }
}

/**
 * Save project config to .transweave.json in the current directory
 */
export async function saveProjectConfig(config: ProjectConfig): Promise<void> {
  const configPath = path.join(process.cwd(), PROJECT_CONFIG_FILENAME);
  await fs.writeFile(configPath, JSON.stringify(config, null, 2), 'utf-8');
}

/**
 * Get API key from environment variable or global config.
 * Priority: TRANSWEAVE_API_KEY env var > global config apiKey field
 */
export async function getApiKey(): Promise<string | undefined> {
  const envKey = process.env.TRANSWEAVE_API_KEY;
  if (envKey) {
    return envKey;
  }
  const config = await loadGlobalConfig();
  return config.apiKey;
}

/**
 * Get server URL from environment variable or global config.
 * Priority: TRANSWEAVE_SERVER env var > global config server field > default
 */
export async function getServer(): Promise<string> {
  const envServer = process.env.TRANSWEAVE_SERVER;
  if (envServer) {
    return envServer;
  }
  const config = await loadGlobalConfig();
  return config.server || 'http://localhost:3001';
}

/**
 * Returns the path to the global config file (for display purposes).
 */
export function getGlobalConfigPath(): string {
  return GLOBAL_CONFIG_PATH;
}
