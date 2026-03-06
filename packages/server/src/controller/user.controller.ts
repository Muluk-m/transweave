import {
  Controller,
  Get,
  Put,
  Delete,
  Param,
  Body,
  Query,
  UseGuards,
  ForbiddenException,
  BadRequestException,
  NotFoundException,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { UserService } from '../service/user.service';
import { AuthGuard } from '../jwt/guard';
import { CurrentUser, UserPayload } from '../jwt/current-user.decorator';

@Controller('api/user')
export class UserController {
  constructor(private readonly userService: UserService) {}

  // Current user information
  @Get('me')
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: UserPayload) {
    return this.userService.findUserById(user.userId);
  }

  // Search users
  @Get('search')
  @UseGuards(AuthGuard)
  async searchUsers(@Query('keyword') keyword: string) {
    try {
      return this.userService.searchUsers(keyword);
    } catch (error) {
      Logger.error('Failed to search users', error);
      throw new InternalServerErrorException('Failed to search users');
    }
  }

  // Get specific user information
  @Get(':id')
  @UseGuards(AuthGuard)
  async getUserById(@Param('id') id: string) {
    const user = await this.userService.findUserById(id);
    if (!user) {
      throw new NotFoundException('User does not exist');
    }

    // Don't return sensitive information like password
    const { password: _, ...safeUser } = user;
    return safeUser;
  }

  // Admin password reset
  @Put(':id/reset-password')
  @UseGuards(AuthGuard)
  async resetPassword(
    @Param('id') userId: string,
    @Body() data: { newPassword: string },
    @CurrentUser() admin: UserPayload,
  ) {
    // Check if the caller is an admin
    const isAdmin = await this.userService.isAdmin(admin.userId);
    if (!isAdmin) {
      throw new ForbiddenException('Only admins can reset passwords');
    }

    // Prevent admin from resetting their own password via this endpoint
    if (admin.userId === userId) {
      throw new BadRequestException('Use change-password for your own account');
    }

    await this.userService.resetPassword(userId, data.newPassword);

    return { success: true, message: 'Password reset successful' };
  }

  @Delete(':id')
  @UseGuards(AuthGuard)
  async deleteUser(@Param('id') id: string, @CurrentUser() user: UserPayload) {
    // Verify if current user is operating on their own account
    if (id !== user.userId) {
      throw new ForbiddenException('You can only delete your own account');
    }
    return this.userService.deleteUser(id);
  }
}
