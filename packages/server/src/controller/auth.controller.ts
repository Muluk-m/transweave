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
import { UserService } from '../service/user.service';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';
import { RegisterDto, LoginDto, SetupDto } from '../dto/auth.dto';

@Controller('api/auth')
export class AuthController {
  constructor(
    private readonly authService: AuthService,
    private readonly userService: UserService,
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
  async register(@Body() data: RegisterDto) {
    try {
      const result = await this.authService.register(data);

      return {
        success: true,
        message: 'Registration successful',
        token: result.token,
        user: result.user,
      };
    } catch (error) {
      Logger.log('register error', error);
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
  async login(@Body() data: LoginDto) {
    try {
      const { token, user } = await this.authService.login(data);

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

  @Get('setup/status')
  async getSetupStatus() {
    const count = await this.userService.getUserCount();
    return { needsSetup: count === 0 };
  }

  @Post('setup')
  async setup(@Body() data: SetupDto) {
    try {
      const result = await this.authService.setup(data);

      return {
        success: true,
        token: result.token,
        user: result.user,
      };
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      throw new HttpException(
        'Setup failed',
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}
