import {
  Controller,
  Post,
  Body,
  HttpException,
  HttpStatus,
  Get,
  UseGuards,
  Request,
  Logger,
} from '@nestjs/common';
import { AuthGuard } from '../jwt/guard';
import { AuthService } from '../service/auth.service';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
  ) {}

  @Get('status')
  @UseGuards(AuthGuard)
  getStatus(@Request() req) {
    return {
      status: 'authenticated',
      user: req.user,
    };
  }

  @Post('register')
  async register(
    @Body() data: { name: string; email: string; password: string; avatar: string },
  ) {
    try {
      const user = await this.authService.register(data);

      return {
        success: true,
        message: 'Registration successful',
        user,
      };
    } catch (error) {
      Logger.log('zws register error', error);
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Registration failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('login')
  async login(@Body() data: { email: string; password: string }) {
    try {
      const { token, user } = await this.authService.login(data);

      return {
        success: true,
        message: 'Login successful',
        token,
        user
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException('Login failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('login_feishu')
  async loginWithFeishu(@Body() data: { code: string }, @Request() req) {
    try {
      const referer = req.headers.referer || '';
      const origin = referer ? new URL(referer).origin : '';
      const redirectUri = `${origin}/login`;

      const { token, user } = await this.authService.loginWithFeishu(data.code, redirectUri);

      return {
        success: true,
        message: 'Login successful',
        token,
        user,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }

      if (error instanceof Error) {
        error.message = 'Login failed';
        throw new HttpException(error, HttpStatus.INTERNAL_SERVER_ERROR);
      }

      throw new HttpException('Login failed', HttpStatus.INTERNAL_SERVER_ERROR);
    }
  }

  @Post('token')
  @UseGuards(AuthGuard)
  async getToken(@CurrentUser() user) {
    const { token } = this.authService.createJwtToken({ ...user, id: user.userId }, '9y');
    return {
      success: true,
      message: 'Token generated',
      token,
    };
  }
}
