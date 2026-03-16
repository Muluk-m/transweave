export class TransweaveError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number | undefined,
    public readonly endpoint: string | undefined,
    public readonly hint: string | undefined,
    public readonly code: string,
  ) {
    super(message);
    this.name = 'TransweaveError';
  }
}

export class AuthError extends TransweaveError {
  constructor(endpoint?: string, message?: string) {
    super(
      message || 'Authentication failed',
      401,
      endpoint,
      'Run `transweave login` to authenticate.',
      'AUTH_ERROR',
    );
    this.name = 'AuthError';
  }
}

export class NotFoundError extends TransweaveError {
  constructor(endpoint?: string, message?: string) {
    super(
      message || `Resource not found: ${endpoint}`,
      404,
      endpoint,
      undefined,
      'NOT_FOUND',
    );
    this.name = 'NotFoundError';
  }
}

export class NetworkError extends TransweaveError {
  constructor(message: string, endpoint?: string) {
    super(
      message,
      undefined,
      endpoint,
      'Check your network connection and server URL.',
      'NETWORK_ERROR',
    );
    this.name = 'NetworkError';
  }
}

export class ServerError extends TransweaveError {
  constructor(statusCode: number, endpoint?: string, message?: string) {
    super(
      message || `Server error (${statusCode})`,
      statusCode,
      endpoint,
      'The server encountered an error. Try again later.',
      'SERVER_ERROR',
    );
    this.name = 'ServerError';
  }
}

/** Exit codes with semantic meaning */
export const ExitCode = {
  SUCCESS: 0,
  ERROR: 1,
  PARTIAL_FAILURE: 2,
  AUTH_FAILURE: 3,
} as const;

export function getExitCode(err: unknown): number {
  if (err instanceof AuthError) return ExitCode.AUTH_FAILURE;
  if (err instanceof TransweaveError) return ExitCode.ERROR;
  return ExitCode.ERROR;
}
