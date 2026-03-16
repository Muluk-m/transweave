import { Controller, Get, Post, Delete, Res, Req, HttpStatus, Logger, All } from '@nestjs/common';
import { Response, Request } from 'express';
import { readFileSync } from 'fs';
import { join } from 'path';
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
      if (!authHeader?.startsWith('Bearer tw_')) {
        return res.status(401).json({
          jsonrpc: '2.0',
          error: {
            code: -32000,
            message: 'API key required. Use Authorization: Bearer tw_...',
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
    const html = readFileSync(join(__dirname, '../docs/mcp-info.html'), 'utf-8');
    res.status(HttpStatus.OK).contentType('text/html').send(html);
  }
}
