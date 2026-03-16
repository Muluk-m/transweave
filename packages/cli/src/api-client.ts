import { AuthError, NetworkError, NotFoundError, ServerError } from './errors.js';

export interface ApiClient {
  get<T = any>(path: string): Promise<T>;
  post<T = any>(path: string, body: any): Promise<T>;
  getRaw(path: string): Promise<Response>;
}

interface RequestOptions {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  timeoutMs?: number;
  maxRetries?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;
const DOWNLOAD_TIMEOUT_MS = 120_000;
const MAX_RETRIES = 2;
const BACKOFF_BASE_MS = 1000;

function isRetryable(status: number): boolean {
  return status >= 500;
}

function throwForStatus(status: number, path: string, body: string): never {
  if (status === 401 || status === 403) {
    throw new AuthError(path, body || 'Authentication failed');
  }
  if (status === 404) {
    throw new NotFoundError(path, body || `Not found: ${path}`);
  }
  if (status >= 500) {
    throw new ServerError(status, path, body || `Server error (${status})`);
  }
  throw new ServerError(status, path, body || `Request failed (${status})`);
}

async function fetchWithRetry(
  url: string,
  init: RequestInit,
  opts: { timeoutMs: number; maxRetries: number; path: string },
): Promise<Response> {
  let lastError: unknown;

  for (let attempt = 0; attempt <= opts.maxRetries; attempt++) {
    if (attempt > 0) {
      const delay = BACKOFF_BASE_MS * Math.pow(2, attempt - 1);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);

    try {
      const response = await fetch(url, { ...init, signal: controller.signal });

      if (response.ok) {
        return response;
      }

      // Don't retry 4xx errors
      if (!isRetryable(response.status)) {
        const text = await response.text().catch(() => '');
        throwForStatus(response.status, opts.path, text);
      }

      // Retryable 5xx — store error and continue loop
      lastError = new ServerError(response.status, opts.path);
    } catch (err: any) {
      if (err instanceof AuthError || err instanceof NotFoundError || err instanceof ServerError) {
        throw err;
      }
      if (err?.name === 'AbortError') {
        lastError = new NetworkError(
          `Request timed out after ${opts.timeoutMs}ms`,
          opts.path,
        );
      } else {
        lastError = new NetworkError(
          err?.message || 'Network request failed',
          opts.path,
        );
      }
      // Retry on network errors
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

/**
 * Create an API client that authenticates with an API key.
 */
export function createApiClient(server: string, apiKey: string): ApiClient {
  const baseUrl = server.replace(/\/+$/, '');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  async function get<T = any>(path: string): Promise<T> {
    const url = `${baseUrl}${path}`;
    const response = await fetchWithRetry(
      url,
      { headers },
      { timeoutMs: DEFAULT_TIMEOUT_MS, maxRetries: MAX_RETRIES, path },
    );
    return response.json() as Promise<T>;
  }

  async function post<T = any>(path: string, body: any): Promise<T> {
    const url = `${baseUrl}${path}`;
    const response = await fetchWithRetry(
      url,
      {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      },
      { timeoutMs: DEFAULT_TIMEOUT_MS, maxRetries: MAX_RETRIES, path },
    );
    return response.json() as Promise<T>;
  }

  async function getRaw(path: string): Promise<Response> {
    const url = `${baseUrl}${path}`;
    return fetchWithRetry(
      url,
      { headers },
      { timeoutMs: DOWNLOAD_TIMEOUT_MS, maxRetries: MAX_RETRIES, path },
    );
  }

  return { get, post, getRaw };
}
