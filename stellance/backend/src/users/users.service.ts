import { Injectable, ConflictException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import type { User } from '../generated/prisma/client';
import { UserRole } from '../generated/prisma/client';

@Injectable()
export class UsersService {
  constructor(private prisma: PrismaService) {}

  async findOneByEmail(email: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { email },
    });
  }

  async findOneById(id: string): Promise<User | null> {
    return this.prisma.user.findUnique({
      where: { id },
    });
  }

  async create(data: {
    email: string;
    name: string;
    passwordHash: string;
    role: UserRole;
  }): Promise<User> {
    return this.prisma.user.create({
      data: {
        email: data.email,
        name: data.name,
        password: data.passwordHash,
        role: data.role,
      },
    });
  }

  async updateProfile(
    id: string,
    data: { name?: string; stellarPublicKey?: string },
  ): Promise<User> {
    if (data.stellarPublicKey) {
      const existing = await this.prisma.user.findUnique({
        where: { stellarPublicKey: data.stellarPublicKey },
        select: { id: true },
      });
      if (existing && existing.id !== id) {
        throw new ConflictException(
          'Stellar public key already registered to another account',
        );
      }
    }

    return this.prisma.user.update({
      where: { id },
      data: {
        ...(data.name !== undefined && { name: data.name }),
        ...(data.stellarPublicKey !== undefined && {
          stellarPublicKey: data.stellarPublicKey,
        }),
      },
    });
  }
}
