import { BadRequestException,  Injectable, UnauthorizedException } from '@nestjs/common';
import { UserService } from './user.service';
import { hashPassword, verifyPassword } from 'src/utils/crypto';
import { User } from '../models';
import { JwtService } from '@nestjs/jwt';

@Injectable()
export class AuthService {
  constructor(
    private readonly userService: UserService,
    private readonly jwtService: JwtService,
  ) {}

  withoutPassword(user: User) {
    const { password: _, ...result } = user;
    return result;
  }

  createJwtToken(user: User, expiresIn = '15d') {
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

}
