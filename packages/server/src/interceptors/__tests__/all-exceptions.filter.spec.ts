import { AllExceptionsFilter } from '../all-exceptions.filter';
import {
  HttpException,
  HttpStatus,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { ArgumentsHost } from '@nestjs/common';

function createMockHost(requestId?: string) {
  const mockJson = jest.fn();
  const mockStatus = jest.fn().mockReturnValue({ json: mockJson });
  const mockResponse = { status: mockStatus };
  const mockRequest = {
    method: 'GET',
    url: '/api/test',
    requestId,
  };

  const host = {
    switchToHttp: () => ({
      getResponse: () => mockResponse,
      getRequest: () => mockRequest,
    }),
  } as unknown as ArgumentsHost;

  return { host, mockStatus, mockJson, mockRequest };
}

describe('AllExceptionsFilter', () => {
  let filter: AllExceptionsFilter;

  beforeAll(() => {
    // Suppress logger output during tests
    process.env.NODE_ENV = 'production';
  });

  beforeEach(() => {
    filter = new AllExceptionsFilter();
  });

  it('should handle NotFoundException', () => {
    const { host, mockStatus, mockJson } = createMockHost();
    const exception = new NotFoundException('Resource not found');

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(404);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 404,
        message: 'Resource not found',
        error: 'NOT_FOUND',
      }),
    );
  });

  it('should handle ForbiddenException', () => {
    const { host, mockStatus, mockJson } = createMockHost();
    const exception = new ForbiddenException('Access denied');

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(403);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 403,
        message: 'Access denied',
      }),
    );
  });

  it('should handle BadRequestException', () => {
    const { host, mockStatus, mockJson } = createMockHost();
    const exception = new BadRequestException('Invalid input');

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(400);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 400,
        message: 'Invalid input',
      }),
    );
  });

  it('should handle database unique constraint violation (23505) as 409', () => {
    const { host, mockStatus, mockJson } = createMockHost();
    const dbError = Object.assign(new Error('duplicate key'), { code: '23505' });

    filter.catch(dbError, host);

    expect(mockStatus).toHaveBeenCalledWith(409);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        message: 'Resource already exists',
        error: 'Conflict',
      }),
    );
  });

  it('should handle other database errors as 500', () => {
    const { host, mockStatus, mockJson } = createMockHost();
    const dbError = Object.assign(new Error('connection refused'), { code: '08001' });

    filter.catch(dbError, host);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });

  it('should handle unknown errors as 500', () => {
    const { host, mockStatus, mockJson } = createMockHost();

    filter.catch(new Error('something unexpected'), host);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
        error: 'InternalServerError',
      }),
    );
  });

  it('should include requestId when available', () => {
    const { host, mockJson } = createMockHost('req-123');
    filter.catch(new NotFoundException('not found'), host);

    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        requestId: 'req-123',
      }),
    );
  });

  it('should not include requestId when not set', () => {
    const { host, mockJson } = createMockHost();
    filter.catch(new NotFoundException('not found'), host);

    const call = mockJson.mock.calls[0][0];
    expect(call.requestId).toBeUndefined();
  });

  it('should not include stack trace in production mode', () => {
    const { host, mockJson } = createMockHost();
    filter.catch(new Error('error'), host);

    const call = mockJson.mock.calls[0][0];
    expect(call.stack).toBeUndefined();
  });

  it('should include stack trace in development mode', () => {
    process.env.NODE_ENV = 'development';
    const { host, mockJson } = createMockHost();
    filter.catch(new Error('dev error'), host);

    const call = mockJson.mock.calls[0][0];
    expect(call.stack).toBeDefined();
    process.env.NODE_ENV = 'production';
  });

  it('should handle HttpException with object response', () => {
    const { host, mockStatus, mockJson } = createMockHost();
    const exception = new HttpException(
      { message: 'Custom error message', statusCode: 422 },
      422,
    );

    filter.catch(exception, host);

    expect(mockStatus).toHaveBeenCalledWith(422);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 422,
        message: 'Custom error message',
      }),
    );
  });

  it('should handle non-Error thrown values', () => {
    const { host, mockStatus, mockJson } = createMockHost();

    filter.catch('string error', host);

    expect(mockStatus).toHaveBeenCalledWith(500);
    expect(mockJson).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 500,
        message: 'Internal server error',
      }),
    );
  });
});
