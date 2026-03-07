import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ApiKeyService } from '../service/api-key.service';
import { requireEnv } from '../config/env';

/**
 * Unified auth guard that accepts both JWT tokens and API keys.
 *
 * - If the Bearer token starts with "tw_", it's validated as an API key.
 * - Otherwise, it's validated as a JWT token.
 *
 * Usage: @UseGuards(AuthGuard) on any route -- same as before.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly jwtService: JwtService,
    private readonly apiKeyService: ApiKeyService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      return false;
    }

    const parts = authHeader.split(' ');
    if (parts.length !== 2 || parts[0] !== 'Bearer') {
      return false;
    }

    const token = parts[1];

    // API key authentication
    if (token.startsWith('tw_')) {
      const result = await this.apiKeyService.validateKey(token);
      if (!result) {
        return false;
      }
      // Check scope: GET→read, everything else→write
      const method = request.method.toUpperCase();
      const requiredScope = method === 'GET' ? 'read' : 'write';
      if (!result.scopes.includes(requiredScope)) {
        return false;
      }
      request.user = {
        userId: result.userId,
        email: result.userEmail,
        name: result.userName,
        avatar: result.userAvatar ?? '',
        authType: 'api_key',
        scopes: result.scopes,
      };
      return true;
    }

    // JWT authentication
    try {
      const payload = this.jwtService.verify(token, {
        secret: requireEnv('JWT_SECRET'),
      });
      request.user = {
        userId: payload.userId,
        email: payload.email,
        name: payload.name,
        avatar: payload.avatar ?? '',
        authType: 'jwt',
      };
      return true;
    } catch {
      return false;
    }
  }
}
