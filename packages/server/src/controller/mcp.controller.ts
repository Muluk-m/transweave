import { Controller, Get, Post, Delete, Res, Req, HttpStatus, Logger, All } from '@nestjs/common';
import { Response, Request } from 'express';
import { McpService } from '../service/mcp.service';
import { StreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/streamableHttp';

@Controller('api/mcp')
export class McpController {
  private readonly logger = new Logger(McpController.name);
  private activeTransports = new Map<string, StreamableHTTPServerTransport>();

  constructor(private readonly mcpService: McpService) {}

  // Streamable HTTP 端点 - 统一处理所有 MCP 请求
  @All()
  async handleMcp(@Req() req: Request, @Res() res: Response) {
    const sessionId = req.headers['mcp-session-id'] as string;
    const method = req.method.toUpperCase();

    this.logger.log(`MCP ${method} request, session: ${sessionId || 'new'}`);

    try {
      // DELETE: 终止会话
      if (method === 'DELETE') {
        if (sessionId) {
          const transport = this.activeTransports.get(sessionId);
          if (transport) {
            transport.close();
            this.activeTransports.delete(sessionId);
            this.logger.log(`Session ${sessionId} terminated`);
          }
        }
        return res.status(HttpStatus.NO_CONTENT).send();
      }

      // GET/POST: 处理 MCP 消息
      let transport = sessionId ? this.activeTransports.get(sessionId) : undefined;

      // 如果没有 transport，创建新的
      if (!transport) {
        transport = new StreamableHTTPServerTransport();
        const newSessionId = transport.sessionId;
        
        // 确保 sessionId 存在
        if (!newSessionId) {
          throw new Error('Failed to generate session ID');
        }

        this.activeTransports.set(newSessionId, transport);

        // 连接 MCP Server
        const server = this.mcpService.getServer();
        await server.connect(transport);

        // 设置会话 ID 头
        res.setHeader('mcp-session-id', newSessionId);

        this.logger.log(`New session created: ${newSessionId}`);

        // 监听 transport 关闭事件
        transport.onclose = () => {
          this.logger.log(`Transport closed for session ${newSessionId}`);
          this.activeTransports.delete(newSessionId);
        };
      }

      // 处理请求 - POST 需要传入 body
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

  // 服务信息页面
  @Get('info')
  async info(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html lang="zh-CN">
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
          <span>运行中</span>
        </div>
      </div>
      <p class="subtitle">基于 Model Context Protocol 的 i18n 词条管理服务 <span class="badge">Streamable HTTP</span></p>
    </div>

    <div class="content">
      <div class="section">
        <h2>
          <svg class="section-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
            <circle cx="12" cy="12" r="10"/>
            <line x1="12" y1="16" x2="12" y2="12"/>
            <line x1="12" y1="8" x2="12.01" y2="8"/>
          </svg>
          服务信息
        </h2>
        <div class="info-grid">
          <div class="info-item">
            <span class="info-label">服务名称</span>
            <span class="info-value">qlj-i18n-mcp-server</span>
          </div>
          <div class="info-item">
            <span class="info-label">版本</span>
            <span class="info-value">1.0.0</span>
          </div>
          <div class="info-item">
            <span class="info-label">SDK 版本</span>
            <span class="info-value">@modelcontextprotocol/sdk v1.25.2</span>
          </div>
          <div class="info-item">
            <span class="info-label">协议版本</span>
            <span class="info-value">MCP 2024-11-05</span>
          </div>
          <div class="info-item">
            <span class="info-label">传输方式</span>
            <span class="info-value">Streamable HTTP (推荐)</span>
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
          可用工具
        </h2>
        
        <div class="tool-card">
          <h3>list_projects</h3>
          <p><strong>描述:</strong> 列出所有 i18n 项目</p>
          <p><strong>参数:</strong> 无</p>
          <p><strong>返回:</strong> 项目列表,包含 id、name、description、languages</p>
        </div>

        <div class="tool-card">
          <h3>list_project_tokens</h3>
          <p><strong>描述:</strong> 查询指定项目的词条列表</p>
          <p><strong>必需参数:</strong></p>
          <ul class="param-list">
            <li><code>projectId</code> - 项目 ID</li>
          </ul>
          <p><strong>返回:</strong> 词条列表,包含 key、module、translations、tags、comment</p>
        </div>

        <div class="tool-card">
          <h3>get_token_details</h3>
          <p><strong>描述:</strong> 获取词条详细信息</p>
          <p><strong>必需参数:</strong></p>
          <ul class="param-list">
            <li><code>tokenId</code> - 词条 ID</li>
          </ul>
          <p><strong>返回:</strong> 词条完整信息,包括历史记录</p>
        </div>

        <div class="tool-card">
          <h3>create_token</h3>
          <p><strong>描述:</strong> 创建新的翻译词条</p>
          <p><strong>必需参数:</strong></p>
          <ul class="param-list">
            <li><code>projectId</code> - 项目 ID</li>
            <li><code>key</code> - 词条 key</li>
            <li><code>translations</code> - 翻译内容对象,如 {"zh-CN": "中文", "en": "English"}</li>
          </ul>
          <p><strong>可选参数:</strong></p>
          <ul class="param-list">
            <li><code>module</code> - 模块代码</li>
            <li><code>tags</code> - 标签数组</li>
            <li><code>comment</code> - 备注</li>
            <li><code>screenshots</code> - 截图 URL 数组</li>
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
          连接方式
        </h2>
        
        <div>
          <h3 style="font-size: 1.125rem; font-weight: 600; margin-bottom: 0.75rem; color: var(--text-primary);">Streamable HTTP (推荐)</h3>
          <p style="color: var(--text-secondary); margin-bottom: 1rem;">使用官方 SDK v1.25+,支持单端点、无状态、动态流式传输</p>
          <div class="code-block">
            <div class="code-header">
              <span class="code-lang">JSON</span>
              <button class="copy-btn" onclick="copyCode(this, 'code1')">复制</button>
            </div>
            <pre id="code1"><code>{
  "mcpServers": {
    "qlj-i18n": {
      "url": "http://localhost:3000/api/mcp"
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
          API 端点
        </h2>
        <ul class="endpoint-list">
          <li class="endpoint-item">
            <span class="method-badge method-post">POST</span>
            <code class="endpoint-path">/api/mcp</code>
            <span class="endpoint-desc">MCP 消息处理 (JSON-RPC 2.0)</span>
          </li>
          <li class="endpoint-item">
            <span class="method-badge method-get">GET</span>
            <code class="endpoint-path">/api/mcp</code>
            <span class="endpoint-desc">建立 SSE 通知连接</span>
          </li>
          <li class="endpoint-item">
            <span class="method-badge method-delete">DELETE</span>
            <code class="endpoint-path">/api/mcp</code>
            <span class="endpoint-desc">终止 MCP 会话</span>
          </li>
          <li class="endpoint-item">
            <span class="method-badge method-get">GET</span>
            <code class="endpoint-path">/api/mcp/info</code>
            <span class="endpoint-desc">服务信息页面 (当前页面)</span>
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
        button.textContent = '已复制!';
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
