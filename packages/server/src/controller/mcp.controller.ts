import { Controller, Get, Post, Delete, Res, Req, HttpStatus, Logger, All } from '@nestjs/common';
import { Response, Request } from 'express';
import { McpService } from '../service/mcp.service';
import { ApiKeyService } from '../service/api-key.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp.js';

@Controller('api/mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);
  private activeTransports = new Map<string, StreamableHTTPServerTransport>();

  constructor(
    private readonly mcpService: McpService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  // Streamable HTTP endpoint - handles all MCP requests
  @All()
  async handleMcp(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.headers['mcp-session-id'] as string;
    const method = req.method.toUpperCase();

    this.logger.log(`MCP ${method} request, session: ${sessionId || 'new'}`);

    try {
      // Authenticate via API key (required for all MCP operations)
      const authHeader = req.headers.authorization;
      if (!authHeader?.startsWith('Bearer qlji_')) {
        return res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'API key required. Use Authorization: Bearer qlji_...',
          },
        });
      }

      const apiKeyResult = await this.apiKeyService.validateKey(
        authHeader.split(' ')[1],
      );
      if (!apiKeyResult) {
        return res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32001,
            message: 'Invalid or expired API key',
          },
        });
      }

      // Store user context on request
      req['mcpUser'] = apiKeyResult;

      // DELETE: terminate session
      if (method === 'DELETE') {
        if (sessionId) {
          const transport = this.activeTransports.get(sessionId);
          if (transport) {
            transport.close();
            this.activeTransports.delete(sessionId);
            this.mcpService.removeSessionUser(sessionId);
            this.logger.log(`Session ${sessionId} terminated`);
          }
        }
        return res.status(HttpStatus.NO_CONTENT).send();
      }

      // GET/POST: handle MCP messages
      let transport = sessionId ? this.activeTransports.get(sessionId) : undefined;

      // Create new transport if needed
      if (!transport) {
        transport = new StreamableHTTPServerTransport();
        const newSessionId = transport.sessionId;

        if (!newSessionId) {
          throw new Error('Failed to generate session ID');
        }

        this.activeTransports.set(newSessionId, transport);

        // Associate session with authenticated user
        this.mcpService.setSessionUser(newSessionId, apiKeyResult.userId);

        // Connect MCP Server
        const server = this.mcpService.getServer();
        await server.connect(transport);

        // Set session ID header
        res.setHeader('mcp-session-id', newSessionId);

        this.logger.log(`New session created: ${newSessionId} for user ${apiKeyResult.userId}`);

        // Listen for transport close events
        transport.onclose = () => {
          this.logger.log(`Transport closed for session ${newSessionId}`);
          this.activeTransports.delete(newSessionId);
          this.mcpService.removeSessionUser(newSessionId);
        };
      } else {
        // Update session user mapping on existing session (in case key changed)
        this.mcpService.setSessionUser(sessionId, apiKeyResult.userId);
      }

      // Handle request - POST needs body
      if (method === 'POST') {
        await transport.handleRequest(req, res, req.body);
      } else {
        await transport.handleRequest(req, res);
      }
    } catch (error: any) {
      this.logger.error('MCP request error:', error);
      if (!res.headersSent) {
        res.status(HttpStatus.INTERNAL_SERVER_ERROR).json({
          error: error.message || 'Internal server error',
        });
      }
    }
  }

  // Service info page (public, no auth required)
  @Get('info')
  async info(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>QLJ i18n MCP Server</title>
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
  <link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&family=JetBrains+Mono:wght@400;500;600&display=swap" rel="stylesheet">
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }

    :root {
      --bg-primary: #ffffff;
      --bg-secondary: #f8fafc;
      --bg-tertiary: #f1f5f9;
      --bg-code: #0f172a;
      --text-primary: #0f172a;
      --text-secondary: #475569;
      --text-tertiary: #64748b;
      --border-color: #e2e8f0;
      --accent-primary: #2563eb;
      --accent-secondary: #3b82f6;
      --success: #10b981;
      --warning: #f59e0b;
      --shadow: rgba(0, 0, 0, 0.1);
    }

    @media (prefers-color-scheme: dark) {
      :root {
        --bg-primary: #0f172a;
        --bg-secondary: #1e293b;
        --bg-tertiary: #334155;
        --bg-code: #020617;
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --text-tertiary: #94a3b8;
        --border-color: #334155;
        --accent-primary: #3b82f6;
        --accent-secondary: #60a5fa;
        --shadow: rgba(0, 0, 0, 0.4);
      }
    }

    body {
      font-family: 'IBM Plex Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      line-height: 1.625;
      color: var(--text-primary);
      background: var(--bg-secondary);
      min-height: 100vh;
      padding: 1rem;
    }

    @media (min-width: 768px) {
      body { padding: 2rem; }
    }

    .container {
      max-width: 1000px;
      margin: 0 auto;
      background: var(--bg-primary);
      border-radius: 12px;
      box-shadow: 0 4px 6px -1px var(--shadow);
      border: 1px solid var(--border-color);
    }

    .header {
      padding: 2rem;
      border-bottom: 1px solid var(--border-color);
    }

    @media (min-width: 768px) {
      .header { padding: 3rem; }
    }

    .header-top {
      display: flex;
      align-items: center;
      justify-content: space-between;
      margin-bottom: 1rem;
    }

    .title-group {
      display: flex;
      align-items: center;
      gap: 1rem;
    }

    .icon {
      width: 40px;
      height: 40px;
      color: var(--accent-primary);
      flex-shrink: 0;
    }

    h1 {
      font-size: 1.75rem;
      font-weight: 700;
      color: var(--text-primary);
      letter-spacing: -0.025em;
    }

    @media (min-width: 768px) {
      h1 { font-size: 2.25rem; }
    }

    .status {
      display: inline-flex;
      align-items: center;
      gap: 0.5rem;
      background: var(--success);
      color: white;
      padding: 0.375rem 0.875rem;
      border-radius: 9999px;
      font-size: 0.875rem;
      font-weight: 600;
      flex-shrink: 0;
    }

    .status-dot {
      width: 8px;
      height: 8px;
      background: white;
      border-radius: 50%;
      animation: pulse 2s ease-in-out infinite;
    }

    @keyframes pulse {
      0%, 100% { opacity: 1; transform: scale(1); }
      50% { opacity: 0.7; transform: scale(0.95); }
    }

    .subtitle {
      color: var(--text-secondary);
      font-size: 1.125rem;
      margin-top: 0.75rem;
      line-height: 1.75;
    }

    .content {
      padding: 2rem;
    }

    @media (min-width: 768px) {
      .content { padding: 3rem; }
    }

    .section {
      margin-bottom: 3rem;
    }

    .section:last-child {
      margin-bottom: 0;
    }

    h2 {
      display: flex;
      align-items: center;
      gap: 0.75rem;
      font-size: 1.5rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 1.5rem;
      padding-bottom: 0.75rem;
      border-bottom: 1px solid var(--border-color);
    }

    .section-icon {
      width: 24px;
      height: 24px;
      color: var(--accent-primary);
    }

    .info-grid {
      display: grid;
      gap: 0.75rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1.5rem;
    }

    .info-item {
      display: flex;
      padding: 0.5rem 0;
    }

    .info-label {
      font-weight: 600;
      color: var(--text-primary);
      min-width: 120px;
      flex-shrink: 0;
    }

    .info-value {
      color: var(--text-secondary);
    }

    .auth-notice {
      background: #fef3c7;
      border: 1px solid #fbbf24;
      border-radius: 8px;
      padding: 1rem 1.5rem;
      margin-bottom: 1.5rem;
      color: #92400e;
      font-size: 0.9375rem;
    }

    @media (prefers-color-scheme: dark) {
      .auth-notice {
        background: #78350f;
        border-color: #d97706;
        color: #fef3c7;
      }
    }

    .auth-notice strong {
      display: block;
      margin-bottom: 0.25rem;
    }

    .tool-card {
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 8px;
      padding: 1.5rem;
      margin-bottom: 1rem;
      transition: all 200ms ease;
    }

    .tool-card:hover {
      border-color: var(--accent-primary);
      box-shadow: 0 4px 12px var(--shadow);
    }

    .tool-card h3 {
      font-family: 'JetBrains Mono', monospace;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-primary);
      margin-bottom: 0.75rem;
    }

    .tool-card p {
      color: var(--text-secondary);
      margin: 0.5rem 0;
      font-size: 0.9375rem;
    }

    .param-list {
      list-style: none;
      margin: 0.75rem 0;
      padding-left: 1rem;
    }

    .param-list li {
      padding: 0.375rem 0;
      color: var(--text-secondary);
      font-size: 0.9375rem;
    }

    code {
      font-family: 'JetBrains Mono', monospace;
      background: var(--bg-tertiary);
      color: var(--accent-primary);
      padding: 0.25rem 0.5rem;
      border-radius: 4px;
      font-size: 0.875rem;
      font-weight: 500;
    }

    .code-block {
      position: relative;
      margin: 1rem 0;
    }

    .code-header {
      display: flex;
      justify-content: space-between;
      align-items: center;
      background: var(--bg-code);
      border-radius: 8px 8px 0 0;
      padding: 0.75rem 1rem;
      border-bottom: 1px solid rgba(255, 255, 255, 0.1);
    }

    .code-lang {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      color: #94a3b8;
      text-transform: uppercase;
      letter-spacing: 0.05em;
    }

    .copy-btn {
      background: transparent;
      border: 1px solid rgba(255, 255, 255, 0.2);
      color: #cbd5e1;
      padding: 0.375rem 0.75rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-family: 'IBM Plex Sans', sans-serif;
      cursor: pointer;
      transition: all 200ms ease;
    }

    .copy-btn:hover {
      background: rgba(255, 255, 255, 0.1);
      border-color: rgba(255, 255, 255, 0.3);
    }

    .copy-btn:active {
      transform: scale(0.95);
    }

    pre {
      background: var(--bg-code);
      color: #e2e8f0;
      padding: 1.25rem;
      border-radius: 0 0 8px 8px;
      overflow-x: auto;
      margin: 0;
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      line-height: 1.7;
    }

    pre code {
      background: transparent;
      color: inherit;
      padding: 0;
      font-weight: 400;
    }

    .endpoint-list {
      list-style: none;
      display: grid;
      gap: 0.75rem;
    }

    .endpoint-item {
      display: flex;
      align-items: center;
      gap: 1rem;
      padding: 1rem;
      background: var(--bg-secondary);
      border: 1px solid var(--border-color);
      border-radius: 6px;
      transition: all 200ms ease;
    }

    .endpoint-item:hover {
      border-color: var(--accent-primary);
    }

    .method-badge {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.75rem;
      font-weight: 600;
      padding: 0.25rem 0.625rem;
      border-radius: 4px;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      flex-shrink: 0;
    }

    .method-get {
      background: #dbeafe;
      color: #1e40af;
    }

    .method-post {
      background: #d1fae5;
      color: #065f46;
    }

    .method-delete {
      background: #fee2e2;
      color: #991b1b;
    }

    @media (prefers-color-scheme: dark) {
      .method-get {
        background: #1e3a8a;
        color: #bfdbfe;
      }
      .method-post {
        background: #064e3b;
        color: #a7f3d0;
      }
      .method-delete {
        background: #7f1d1d;
        color: #fecaca;
      }
    }

    .endpoint-path {
      font-family: 'JetBrains Mono', monospace;
      font-size: 0.875rem;
      color: var(--text-primary);
      font-weight: 500;
      flex: 1;
    }

    .endpoint-desc {
      color: var(--text-tertiary);
      font-size: 0.875rem;
    }

    @media (max-width: 767px) {
      .endpoint-item {
        flex-direction: column;
        align-items: flex-start;
      }
    }

    .badge {
      display: inline-block;
      padding: 0.25rem 0.625rem;
      border-radius: 4px;
      font-size: 0.75rem;
      font-weight: 600;
      text-transform: uppercase;
      letter-spacing: 0.05em;
      background: #10b981;
      color: white;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="header-top">
        <div class="title-group">
          <svg class="icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 2L2 7l10 5 10-5-10-5z"/>
            <path d="M2 17l10 5 10-5"/>
            <path d="M2 12l10 5 10-5"/>
          </svg>
          <h1>QLJ i18n MCP Server</h1>
        </div>
        <div class="status">
          <span class="status-dot"></span>
          <span>Running</span>
        </div>
      </div>
      <p class="subtitle">i18n translation management service via Model Context Protocol <span class="badge">Streamable HTTP</span></p>
    </div>

    <div class="content">
      <div class="section">
        <h2>
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          Service Info
        </h2>
        <div class="auth-notice">
          <strong>Authentication Required</strong>
          All MCP requests require a valid API key. Include the header <code>Authorization: Bearer qlji_...</code> with every request. Generate an API key from the web UI at Settings &gt; API Keys.
        </div>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">Service Name</span>
            <span class="info-value">qlj-i18n-mcp-server</span>
          </div>
          <div class="info-item">
            <span class="info-label">Version</span>
            <span class="info-value">1.0.0</span>
          </div>
          <div class="info-item">
            <span class="info-label">SDK Version</span>
            <span class="info-value">@modelcontextprotocol/sdk v1.25.2</span>
          </div>
          <div class="info-item">
            <span class="info-label">Protocol</span>
            <span class="info-value">MCP 2024-11-05</span>
          </div>
          <div class="info-item">
            <span class="info-label">Transport</span>
            <span class="info-value">Streamable HTTP</span>
          </div>
          <div class="info-item">
            <span class="info-label">Auth</span>
            <span class="info-value">API Key (Bearer qlji_...)</span>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M12 19l7-7 3 3-7 7-3-3z"/>
            <path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/>
            <path d="M2 2l7.586 7.586"/>
            <circle cx="11" cy="11" r="2"/>
          </svg>
          Available Tools
        </h2>

        <div class="tool-card">
          <h3>list_projects</h3>
          <p><strong>Description:</strong> List all i18n projects</p>
          <p><strong>Parameters:</strong> None</p>
          <p><strong>Returns:</strong> Project list including id, name, description, languages</p>
        </div>

        <div class="tool-card">
          <h3>list_project_tokens</h3>
          <p><strong>Description:</strong> List tokens for a specific project</p>
          <p><strong>Required parameters:</strong></p>
          <ul class="param-list">
            <li><code>projectId</code> - Project ID</li>
          </ul>
          <p><strong>Returns:</strong> Token list including key, module, translations, tags, comment</p>
        </div>

        <div class="tool-card">
          <h3>get_token_details</h3>
          <p><strong>Description:</strong> Get detailed information about a token</p>
          <p><strong>Required parameters:</strong></p>
          <ul class="param-list">
            <li><code>tokenId</code> - Token ID</li>
          </ul>
          <p><strong>Returns:</strong> Full token information including history</p>
        </div>

        <div class="tool-card">
          <h3>create_token</h3>
          <p><strong>Description:</strong> Create a new translation token</p>
          <p><strong>Required parameters:</strong></p>
          <ul class="param-list">
            <li><code>projectId</code> - Project ID</li>
            <li><code>key</code> - Token key</li>
            <li><code>translations</code> - Translations object, e.g. {"zh-CN": "Chinese", "en": "English"}</li>
          </ul>
          <p><strong>Optional parameters:</strong></p>
          <ul class="param-list">
            <li><code>module</code> - Module code</li>
            <li><code>tags</code> - Tags array</li>
            <li><code>comment</code> - Comment</li>
            <li><code>screenshots</code> - Screenshot URL array</li>
          </ul>
        </div>

        <div class="tool-card">
          <h3>update_token</h3>
          <p><strong>Description:</strong> Update an existing translation token</p>
          <p><strong>Required parameters:</strong></p>
          <ul class="param-list">
            <li><code>tokenId</code> - Token ID to update</li>
          </ul>
          <p><strong>Optional parameters:</strong></p>
          <ul class="param-list">
            <li><code>key</code> - Updated token key</li>
            <li><code>translations</code> - Updated translations { "lang": "text" }</li>
            <li><code>module</code> - Updated module code</li>
            <li><code>tags</code> - Updated tags</li>
            <li><code>comment</code> - Updated comment</li>
          </ul>
        </div>
      </div>

      <div class="section">
        <h2>
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6z"/>
            <rect x="2" y="9" width="4" height="12"/>
            <circle cx="4" cy="4" r="2"/>
          </svg>
          Connection
        </h2>

        <div>
          <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary);">Streamable HTTP</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">Use official MCP SDK v1.25+. Requires API key authentication.</p>
          <div class="code-block">
            <div class="code-header">
              <span class="code-lang">JSON</span>
              <button class="copy-btn" onclick="copyCode(this, 'code1')">Copy</button>
            </div>
            <pre id="code1"><code>{
  "mcpServers": {
    "qlj-i18n": {
      "url": "http://localhost:3001/api/mcp",
      "headers": {
        "Authorization": "Bearer qlji_YOUR_API_KEY_HERE"
      }
    }
  }
}</code></pre>
          </div>
        </div>
      </div>

      <div class="section">
        <h2>
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
            <polyline points="14 2 14 8 20 8"/>
            <line x1="16" y1="13" x2="8" y2="13"/>
            <line x1="16" y1="17" x2="8" y2="17"/>
            <polyline points="10 9 9 9 8 9"/>
          </svg>
          API Endpoints
        </h2>
        <ul class="endpoint-list">
          <li class="endpoint-item">
            <span class="method-badge method-post">POST</span>
            <code class="endpoint-path">/api/mcp</code>
            <span class="endpoint-desc">MCP message handling (JSON-RPC 2.0) - requires API key</span>
          </li>
          <li class="endpoint-item">
            <span class="method-badge method-get">GET</span>
            <code class="endpoint-path">/api/mcp</code>
            <span class="endpoint-desc">Establish SSE notification connection - requires API key</span>
          </li>
          <li class="endpoint-item">
            <span class="method-badge method-delete">DELETE</span>
            <code class="endpoint-path">/api/mcp</code>
            <span class="endpoint-desc">Terminate MCP session - requires API key</span>
          </li>
          <li class="endpoint-item">
            <span class="method-badge method-get">GET</span>
            <code class="endpoint-path">/api/mcp/info</code>
            <span class="endpoint-desc">Service info page (this page, public)</span>
          </li>
        </ul>
      </div>
    </div>
  </div>

  <script>
    function copyCode(button, codeId) {
      const code = document.getElementById(codeId).textContent;
      navigator.clipboard.writeText(code).then(() => {
        const originalText = button.textContent;
        button.textContent = 'Copied!';
        button.style.background = 'rgba(16, 185, 129, 0.2)';
        button.style.borderColor = 'rgba(16, 185, 129, 0.4)';
        button.style.color = '#10b981';
        setTimeout(() => {
          button.textContent = originalText;
          button.style.background = 'transparent';
          button.style.borderColor = 'rgba(255, 255, 255, 0.2)';
          button.style.color = '#cbd5e1';
        }, 2000);
      });
    }
  </script>
</body>
</html>
`;
    res.status(HttpStatus.OK).contentType('text/html').send(html);
  }
}
