import { WebhookService } from '../webhook.service';

describe('WebhookService', () => {
  let service: WebhookService;
  const mockDb = {
    insert: jest.fn().mockReturnThis(),
    select: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    from: jest.fn().mockReturnThis(),
    where: jest.fn().mockReturnThis(),
    set: jest.fn().mockReturnThis(),
    values: jest.fn().mockReturnThis(),
    returning: jest.fn().mockResolvedValue([{ id: '1', url: 'https://example.com', secret: 'abc', events: ['token.created'], active: true }]),
  };

  beforeEach(() => {
    service = new WebhookService(mockDb as any);
  });

  describe('SSRF protection', () => {
    it('should block localhost', async () => {
      // Access private method via any cast
      const isPrivate = (service as any).isPrivateHost('localhost');
      expect(isPrivate).toBe(true);
    });

    it('should block 127.0.0.1', () => {
      expect((service as any).isPrivateHost('127.0.0.1')).toBe(true);
    });

    it('should block 10.x.x.x', () => {
      expect((service as any).isPrivateHost('10.0.0.1')).toBe(true);
    });

    it('should block 192.168.x.x', () => {
      expect((service as any).isPrivateHost('192.168.1.1')).toBe(true);
    });

    it('should block 172.16-31.x.x', () => {
      expect((service as any).isPrivateHost('172.16.0.1')).toBe(true);
      expect((service as any).isPrivateHost('172.31.255.255')).toBe(true);
    });

    it('should allow public IPs', () => {
      expect((service as any).isPrivateHost('8.8.8.8')).toBe(false);
    });

    it('should allow public domains', () => {
      expect((service as any).isPrivateHost('example.com')).toBe(false);
    });
  });

  describe('HMAC signing', () => {
    it('should produce consistent signatures', () => {
      const sig1 = (service as any).sign('{"event":"test"}', 'secret123');
      const sig2 = (service as any).sign('{"event":"test"}', 'secret123');
      expect(sig1).toBe(sig2);
    });

    it('should produce different signatures for different bodies', () => {
      const sig1 = (service as any).sign('body1', 'secret');
      const sig2 = (service as any).sign('body2', 'secret');
      expect(sig1).not.toBe(sig2);
    });

    it('should produce different signatures for different secrets', () => {
      const sig1 = (service as any).sign('body', 'secret1');
      const sig2 = (service as any).sign('body', 'secret2');
      expect(sig1).not.toBe(sig2);
    });
  });
});
