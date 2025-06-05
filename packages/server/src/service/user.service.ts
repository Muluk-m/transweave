import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { User, UserDocument } from '../models';
import { verifyPassword } from '../utils/crypto';

@Injectable()
export class UserService {
  constructor(@InjectModel(User.name) private userModel: Model<UserDocument>) {}

  // Create user
  async createUser(data: Partial<Omit<User, '_id' | 'memberships'>>): Promise<User> {
    const createdUser = await new this.userModel({
      name: data.name,
      email: data.email,
      password: data.password,
      avatar: data.avatar,
      feishuId: data.feishuId,
      feishuUnionId: data.feishuUnionId,
      loginProvider: data.loginProvider,
    }).save();
    const safeUser = createdUser.toObject();
    delete safeUser.password;
    return safeUser;
  }

  // Query all users
  async findAllUsers(): Promise<User[]> {
    return this.userModel.find().exec();
  }

  // Query user by Feishu ID
  async findUserByFeishuId(feishuId: string): Promise<User | null> {
    return this.userModel.findOne({ feishuId }).lean();
  }

  // Query user by ID
  async findUserById(id: string): Promise<User | null> {
    return this.userModel.findById(id).exec();
  }

  // Query user by email
  async findUserByEmail(email: string): Promise<User | null> {
    return this.userModel.findOne({ email }).exec();
  }

  // Update user information
  async updateUser(
    id: string,
    data: { name?: string; email?: string },
  ): Promise<User | null> {
    return this.userModel
      .findByIdAndUpdate(
        id,
        {
          ...(data.name && { name: data.name }),
          ...(data.email && { email: data.email }),
          updatedAt: new Date(),
        },
        { new: true },
      )
      .exec();
  }

  // Delete user
  async deleteUser(id: string): Promise<User | null> {
    return this.userModel.findByIdAndDelete(id).exec();
  }

  // Search users
  async searchUsers(keyword: string): Promise<Partial<User>[]> {
    if (!keyword || keyword.trim().length < 2) {
      return []; // Require at least 2 characters
    }

    return this.userModel
      .find({
        $or: [
          { name: { $regex: keyword, $options: 'i' } },
          { email: { $regex: keyword, $options: 'i' } },
        ],
      })
      .select('id name email')
      .limit(10)
      .exec();
  }

  async validateUser(
    nameOrEmail: string,
    password: string,
  ): Promise<User | null> {
    // First try to find user by email or name
    const user = await this.userModel
      .findOne({
        $or: [{ email: nameOrEmail }, { name: nameOrEmail }],
      })
      .exec();

    // If user is found and password matches
    if (user) {
      // Verify password
      const isPasswordValid = verifyPassword(password, user.password);
      if (isPasswordValid) {
        return user;
      }
    }

    // Validation failed
    return null;
  }
}
