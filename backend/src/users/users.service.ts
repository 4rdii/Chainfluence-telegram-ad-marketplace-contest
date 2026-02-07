import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateMeDto } from './dto/update-me.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async findById(userId: number) {
    const user = await this.prisma.user.findUnique({
      where: { id: BigInt(userId) },
    });
    if (!user) {
      throw new NotFoundException('User not found');
    }
    return this.toResponse(user);
  }

  async updateMe(userId: number, dto: UpdateMeDto) {
    const user = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: {
        ...(dto.username !== undefined && { username: dto.username }),
        ...(dto.isPublisher !== undefined && { isPublisher: dto.isPublisher }),
        ...(dto.isAdvertiser !== undefined && { isAdvertiser: dto.isAdvertiser }),
      },
    });
    return this.toResponse(user);
  }

  async updateWallet(userId: number, walletAddress: string) {
    const user = await this.prisma.user.update({
      where: { id: BigInt(userId) },
      data: { walletAddress },
    });
    return this.toResponse(user);
  }

  private toResponse(user: {
    id: bigint;
    username: string | null;
    walletAddress: string | null;
    isPublisher: boolean;
    isAdvertiser: boolean;
    memberSince: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: user.id.toString(),
      username: user.username,
      walletAddress: user.walletAddress,
      isPublisher: user.isPublisher,
      isAdvertiser: user.isAdvertiser,
      memberSince: user.memberSince?.toISOString() ?? null,
      createdAt: user.createdAt.toISOString(),
      updatedAt: user.updatedAt.toISOString(),
    };
  }
}
