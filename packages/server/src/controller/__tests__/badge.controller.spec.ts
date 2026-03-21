import { BadgeController } from '../badge.controller';

describe('BadgeController', () => {
  let controller: BadgeController;
  const mockTokenService = {
    getLanguageCompletion: jest.fn(),
  };

  beforeEach(() => {
    controller = new BadgeController(mockTokenService as any);
    jest.clearAllMocks();
  });

  it('should return SVG with correct content type', async () => {
    mockTokenService.getLanguageCompletion.mockResolvedValue([
      { language: 'en', total: 10, completed: 8, percentage: 80 },
      { language: 'zh', total: 10, completed: 10, percentage: 100 },
    ]);

    const res = {
      send: jest.fn(),
      setHeader: jest.fn(),
      header: jest.fn(),
    };

    await controller.getBadge('project-1', res as any);

    expect(res.send).toHaveBeenCalledTimes(1);
    const svg = res.send.mock.calls[0][0] as string;
    expect(svg).toContain('<svg');
    expect(svg).toContain('translations');
    expect(svg).toContain('90%'); // avg of 80 and 100
  });

  it('should show 0% for empty projects', async () => {
    mockTokenService.getLanguageCompletion.mockResolvedValue([]);

    const res = { send: jest.fn(), setHeader: jest.fn(), header: jest.fn() };
    await controller.getBadge('project-1', res as any);

    const svg = res.send.mock.calls[0][0] as string;
    expect(svg).toContain('0%');
  });

  it('should use green color for >80%', async () => {
    mockTokenService.getLanguageCompletion.mockResolvedValue([
      { language: 'en', total: 10, completed: 9, percentage: 90 },
    ]);

    const res = { send: jest.fn(), setHeader: jest.fn(), header: jest.fn() };
    await controller.getBadge('project-1', res as any);

    const svg = res.send.mock.calls[0][0] as string;
    expect(svg).toContain('#4c1'); // green
  });

  it('should use yellow color for 50-80%', async () => {
    mockTokenService.getLanguageCompletion.mockResolvedValue([
      { language: 'en', total: 10, completed: 6, percentage: 60 },
    ]);

    const res = { send: jest.fn(), setHeader: jest.fn(), header: jest.fn() };
    await controller.getBadge('project-1', res as any);

    const svg = res.send.mock.calls[0][0] as string;
    expect(svg).toContain('#dfb317'); // yellow
  });

  it('should use red color for <=50%', async () => {
    mockTokenService.getLanguageCompletion.mockResolvedValue([
      { language: 'en', total: 10, completed: 3, percentage: 30 },
    ]);

    const res = { send: jest.fn(), setHeader: jest.fn(), header: jest.fn() };
    await controller.getBadge('project-1', res as any);

    const svg = res.send.mock.calls[0][0] as string;
    expect(svg).toContain('#e05d44'); // red
  });

  it('should handle errors gracefully', async () => {
    mockTokenService.getLanguageCompletion.mockRejectedValue(new Error('fail'));

    const res = { send: jest.fn(), setHeader: jest.fn(), header: jest.fn() };
    await controller.getBadge('project-1', res as any);

    const svg = res.send.mock.calls[0][0] as string;
    expect(svg).toContain('0%');
  });
});
