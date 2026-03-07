import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { UserRepository } from '../repository/user.repository';
import { hashPassword, verifyPassword } from '../utils/crypto';
import type { User, NewUser } from '../db/schema/users';

@Injectable()
export class UserService {
  constructor(private readonly userRepo: UserRepository) {}

  // Create user
  async createUser(
    data: Partial<Omit<NewUser, 'id'>> & { name: string; email: string },
  ): Promise<Omit<User, 'password'>> {
    const created = await this.userRepo.create(data as NewUser);
    const { password: _, ...user } = created;
    return user;
  }

  // Query all users
  async findAllUsers(): Promise<User[]> {
    return this.userRepo.findAll();
  }

  // Query user by ID
  async findUserById(id: string): Promise<User | null> {
    return this.userRepo.findById(id);
  }

  // Query user by email
  async findUserByEmail(email: string): Promise<User | null> {
    return this.userRepo.findByEmail(email);
  }

  // Update user information
  async updateUser(
    id: string,
    data: { name?: string; email?: string },
  ): Promise<User | null> {
    return this.userRepo.update(id, data);
  }

  // Delete user
  async deleteUser(id: string): Promise<void> {
    return this.userRepo.delete(id);
  }

  // Search users
  async searchUsers(keyword: string): Promise<Partial<User>[]> {
    if (!keyword || keyword.trim().length < 2) {
      return []; // Require at least 2 characters
    }
    return this.userRepo.search(keyword);
  }

  // Validate user credentials
  async validateUser(
    nameOrEmail: string,
    password: string,
  ): Promise<User | null> {
    // Try email first
    let user = await this.userRepo.findByEmail(nameOrEmail);

    // If not found by email, try by name
    if (!user) {
      user = await this.userRepo.findByName(nameOrEmail);
    }

    if (user && user.password) {
      const isPasswordValid = verifyPassword(password, user.password);
      if (isPasswordValid) {
        return user;
      }
    }

    return null;
  }

  // Get total user count
  async getUserCount(): Promise<number> {
    return this.userRepo.count();
  }

  // Reset user password
  async resetPassword(userId: string, newPassword: string): Promise<void> {
    const hashed = hashPassword(newPassword);
    await this.userRepo.update(userId, { password: hashed });
  }

  // Check if user is admin
  async isAdmin(userId: string): Promise<boolean> {
    const user = await this.userRepo.findById(userId);
    return user?.isAdmin ?? false;
  }

  // Change user password (requires current password verification)
  async changePassword(
    userId: string,
    currentPassword: string,
    newPassword: string,
  ): Promise<{ success: true; message: string }> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.password) {
      throw new UnauthorizedException(
        'Password change is not available for OAuth accounts',
      );
    }

    const isValid = verifyPassword(currentPassword, user.password);
    if (!isValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashed = hashPassword(newPassword);
    await this.userRepo.update(userId, { password: hashed });

    return { success: true, message: 'Password changed successfully' };
  }

  // Update user profile (name, avatar)
  async updateProfile(
    userId: string,
    data: { name?: string; avatar?: string },
  ): Promise<Omit<User, 'password'>> {
    const user = await this.userRepo.findById(userId);
    if (!user) {
      throw new NotFoundException('User not found');
    }

    const updateData: Partial<NewUser> = {};
    if (data.name !== undefined) {
      updateData.name = data.name;
    }
    if (data.avatar !== undefined) {
      updateData.avatar = data.avatar;
    }

    const updated = await this.userRepo.update(userId, updateData);
    if (!updated) {
      throw new NotFoundException('User not found');
    }

    const { password: _, ...safeUser } = updated;
    return safeUser;
  }
}
