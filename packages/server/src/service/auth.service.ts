import {
  BadRequestException,
  Injectable,
  UnauthorizedException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { UserService } from './user.service';
import { TeamService } from './team.service';
import { hashPassword, verifyPassword } from 'src/utils/crypto';
import type { User } from '../db/schema/users';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
    @Inject(forwardRef(() => TeamService))
    private readonly teamService: TeamService,
  ) {}

  withoutPassword(user: User | Omit<User, 'password'>) {
    if ('password' in user) {
      const { password: _, ...result } = user;
      return result;
    }
    return user;
  }

  createJwtToken(user: { id: string; email: string; name: string; avatar: string | null }, expiresIn = '15d') {
    const payload = {
      email: user.email,
      name: user.name,
      avatar: user.avatar,
      userId: user.id,
    };

    return {
      token: this.jwtService.sign(payload, { expiresIn }),
      payload,
    };
  }

  async register(data: {
    name: string;
    email: string;
    password: string;
    avatar?: string;
    isAdmin?: boolean;
  }) {
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
      avatar: data.avatar ?? null,
      loginProvider: 'local',
      isAdmin: data.isAdmin ?? false,
    });

    // Create JWT token
    const { token } = this.createJwtToken({
      id: (newUser as any).id,
      email: newUser.email,
      name: newUser.name,
      avatar: newUser.avatar ?? null,
    });

    return {
      token,
      user: this.withoutPassword(newUser),
    };
  }

  async login(data: { email: string; password: string }) {
    const user = await this.userService.findUserByEmail(data.email);
    if (!user) {
      throw new UnauthorizedException('Email or password incorrect');
    }

    if (!user.password) {
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

  async setup(data: {
    name: string;
    email: string;
    password: string;
    teamName: string;
  }) {
    const userCount = await this.userService.getUserCount();
    if (userCount > 0) {
      throw new BadRequestException('Setup already completed');
    }

    // Create admin user
    const result = await this.register({
      name: data.name,
      email: data.email,
      password: data.password,
      isAdmin: true,
    });

    // Create default team
    const teamUrl = data.teamName
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    await this.teamService.createTeam({
      name: data.teamName,
      url: teamUrl || 'default',
      userId: (result.user as any).id,
    });

    return result;
  }
}
