import { BadRequestException, HttpException, HttpStatus, Injectable, UnauthorizedException } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom, catchError, of } from 'rxjs';
import { UserService } from './user.service';
import { hashPassword, verifyPassword } from 'src/utils/crypto';
import { User } from '../models';
import { JwtService } from '@nestjs/jwt';
import { MembershipService } from './membership.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly httpService: HttpService,
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    private readonly membershipService: MembershipService,
  ) {}

  private readonly clientId = process.env.FEISHU_CLIENT_ID;
  private readonly clientSecret = process.env.FEISHU_CLIENT_SECRET;

  withoutPassword(user: User) {
    const { password: _, ...result } = user;
    return result;
  }

  createJwtToken(user: User) {
    const payload = {
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      userId: user.id,
    };

    return {
      token: this.jwtService.sign(payload),
      payload,
    };
  }

  async getFeishuAccessToken(code: string, redirectUri: string) {
    const response = await firstValueFrom(
      this.httpService.post<{ access_token: string }>('https://open.feishu.cn/open-apis/authen/v2/oauth/token', {
        grant_type: 'authorization_code',
        client_id: this.clientId,
        client_secret: this.clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    );

    const accessToken = response.data.access_token;

    if (!accessToken) {
      throw new Error('Failed to login with Feishu');
    }

    const userInfoResponse = await firstValueFrom(
      this.httpService.get('https://open.feishu.cn/open-apis/authen/v1/user_info', {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }),
    );

    const userInfo = userInfoResponse.data.data;

    return {
      accessToken,
      userInfo,
    };
  }

  async register(data: { name: string; email: string; password: string; avatar: string }) {
    const existingUser = await this.userService.findUserByEmail(data.email);

    if (existingUser) {
      throw new BadRequestException('Email is already registered');
    }

    // Password encryption
    const hashedPassword = hashPassword(data.password);

    // Create new user
    const newUser = await this.userService.createUser({
      name: data.name,
      email: data.email,
      password: hashedPassword,
      avatar: data.avatar,
      loginProvider: 'local',
    });

    // Return user information without password
    return this.withoutPassword(newUser);
  }

  async login(data: { email: string; password: string }) {
    const user = await this.userService.findUserByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException('Email or password incorrect');
    }

    // Verify password
    const isPasswordValid = verifyPassword(data.password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('Email or password incorrect');
    }

    const { token } = this.createJwtToken(user);

    return {
      token,
      user: this.withoutPassword(user),
    };
  }

  async loginWithFeishu(code: string, redirectUri: string) {
    const { userInfo } = await this.getFeishuAccessToken(code, redirectUri);

    const existingUser = await this.userService.findUserByFeishuId(userInfo.open_id);

    if (existingUser) {
      // 如果用户存在，则直接登录
      const { token } = this.createJwtToken(existingUser);
      await this.joinDefaultTeam(existingUser.id);

      return {
        token,
        user: this.withoutPassword(existingUser),
      };
    }

    // 如果用户不存在，则创建新用户
    const newUser = await this.userService.createUser({
      name: userInfo.name,
      email: userInfo.enterprise_email,
      avatar: userInfo.avatar_url,
      feishuId: userInfo.open_id,
      feishuUnionId: userInfo.union_id,
      loginProvider: 'feishu',
    });

    const { token } = this.createJwtToken(newUser);

    await this.joinDefaultTeam(newUser.id);

    return {
      token,
      user: this.withoutPassword(newUser),
    };
  }

  async joinDefaultTeam(userId: string) {
    const defaultTeam = '680f39ddddef3c5e631920e8'
    const isMember = await this.membershipService.isMember(defaultTeam, userId);

    if (isMember) {
      return;
    }

    return this.membershipService.createMembership({
      teamId: defaultTeam,
      userId,
      role: 'member',
    });
  }
}
