import {
  Body,
  Controller,
  Post,
  Res,
  UseGuards,
} from '@nestjs/common';
import type { Response } from 'express';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';
import { AgentService } from '../service/agent.service';

@Controller('api/agent')
@UseGuards(AuthGuard)
export class AgentController {
  constructor(private readonly agentService: AgentService) {}

  @Post('chat')
  async chat(
    @Body()
    data: {
      message: string;
      projectId: string;
      history?: Array<{
        role: 'user' | 'assistant';
        content: string;
      }>;
    },
    @CurrentUser() user: UserPayload,
    @Res() res: Response,
  ) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.flushHeaders();

    try {
      for await (const event of this.agentService.chat({
        message: data.message,
        projectId: data.projectId,
        history: data.history,
        userId: user.userId,
      })) {
        res.write(`data: ${JSON.stringify(event)}\n\n`);
      }
    } catch (err) {
      res.write(
        `data: ${JSON.stringify({
          type: 'error',
          content: err instanceof Error ? err.message : String(err),
        })}\n\n`,
      );
    }

    res.end();
  }
}
