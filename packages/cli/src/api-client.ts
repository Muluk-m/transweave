export interface ApiClient {
  get(path: string): Promise<any>;
  post(path: string, body: any): Promise<any>;
  getRaw(path: string): Promise<Response>;
}

/**
 * Create an API client that authenticates with an API key.
 */
export function createApiClient(server: string, apiKey: string): ApiClient {
  const baseUrl = server.replace(/\/+$/, '');
  const headers: Record<string, string> = {
    Authorization: `Bearer ${apiKey}`,
  };

  async function get(path: string): Promise<any> {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`GET ${path} failed (${response.status}): ${text}`);
    }
    return response.json();
  }

  async function post(path: string, body: any): Promise<any> {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        ...headers,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`POST ${path} failed (${response.status}): ${text}`);
    }
    return response.json();
  }

  async function getRaw(path: string): Promise<Response> {
    const url = `${baseUrl}${path}`;
    const response = await fetch(url, { headers });
    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`GET ${path} failed (${response.status}): ${text}`);
    }
    return response;
  }

  return { get, post, getRaw };
}
