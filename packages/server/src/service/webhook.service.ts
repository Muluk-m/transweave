import { Inject, Injectable, Logger } from '@nestjs/common';
import { createHmac } from 'crypto';
import { eq } from 'drizzle-orm';
import { DRIZZLE } from '../db/drizzle.provider';
import type { DrizzleDB } from '../db/drizzle.types';
import { webhooks, type Webhook, type NewWebhook } from '../db/schema';

export type WebhookEvent =
  | 'token.created'
  | 'token.updated'
  | 'token.deleted'
  | 'token.translated'
  | 'token.status_changed'
  | 'project.exported'
  | 'project.imported';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(@Inject(DRIZZLE) private readonly db: DrizzleDB) {}

  async create(data: NewWebhook): Promise<Webhook> {
    const [webhook] = await this.db.insert(webhooks).values(data).returning();
    return webhook;
  }

  async findByProject(projectId: string): Promise<Webhook[]> {
    return this.db
      .select()
      .from(webhooks)
      .where(eq(webhooks.projectId, projectId));
  }

  async update(
    id: string,
    data: Partial<Pick<Webhook, 'url' | 'secret' | 'events' | 'active'>>,
  ): Promise<Webhook> {
    const [updated] = await this.db
      .update(webhooks)
      .set({ ...data, updatedAt: new Date() })
      .where(eq(webhooks.id, id))
      .returning();
    return updated;
  }

  async delete(id: string): Promise<void> {
    await this.db.delete(webhooks).where(eq(webhooks.id, id));
  }

  async deliver(
    projectId: string,
    event: WebhookEvent,
    payload: any,
  ): Promise<void> {
    const projectWebhooks = await this.findByProject(projectId);
    const active = projectWebhooks.filter(
      (w) => w.active && (w.events as string[]).includes(event),
    );

    for (const webhook of active) {
      this.sendWebhook(webhook, event, payload).catch((err) => {
        this.logger.warn(
          `Webhook delivery failed for ${webhook.id}: ${err.message}`,
        );
      });
    }
  }

  private async sendWebhook(
    webhook: Webhook,
    event: WebhookEvent,
    payload: any,
  ): Promise<void> {
    const body = JSON.stringify({ event, payload, timestamp: Date.now() });
    const signature = this.sign(body, webhook.secret);

    // SSRF protection: block private IPs
    const url = new URL(webhook.url);
    const hostname = url.hostname;
    if (this.isPrivateHost(hostname)) {
      this.logger.warn(`Blocked webhook to private host: ${hostname}`);
      return;
    }

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);

    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Webhook-Signature': signature,
          'X-Webhook-Event': event,
        },
        body,
        signal: controller.signal,
      });

      if (!response.ok) {
        this.logger.warn(
          `Webhook ${webhook.id} returned ${response.status}`,
        );
      }
    } finally {
      clearTimeout(timeout);
    }
  }

  private sign(body: string, secret: string): string {
    return createHmac('sha256', secret).update(body).digest('hex');
  }

  private isPrivateHost(hostname: string): boolean {
    if (hostname === 'localhost' || hostname === '127.0.0.1') return true;
    if (hostname.startsWith('10.')) return true;
    if (hostname.startsWith('192.168.')) return true;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(hostname)) return true;
    if (hostname === '0.0.0.0' || hostname === '::1') return true;
    return false;
  }
}
