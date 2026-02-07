import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramApiService } from '../telegram/telegram-api.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramApiService,
  ) {}

  async create(userId: number, dto: CreateChannelDto) {
    const chatId = dto.channelId ?? dto.username;
    if (chatId === undefined) {
      throw new Error('channelId or username is required');
    }
    const chat = await this.telegram.getChat(chatId);
    const botId = await this.telegram.getBotId();
    const isAdmin = await this.telegram.isBotAdmin(chat.id, botId);
    if (!isAdmin) {
      throw new ForbiddenException('Bot must be an administrator of the channel');
    }
    const id = BigInt(chat.id);
    const existing = await this.prisma.channel.findUnique({
      where: { id },
    });
    if (existing) {
      if (existing.ownerId !== BigInt(userId)) {
        throw new ForbiddenException('Channel already added by another user');
      }
      return this.toResponse(existing);
    }
    const channel = await this.prisma.channel.create({
      data: {
        id,
        ownerId: BigInt(userId),
        username: chat.username ?? null,
        title: chat.title ?? null,
        isVerified: true,
        statsUpdatedAt: new Date(),
      },
    });
    return this.toResponse(channel);
  }

  async findMine(userId: number) {
    const channels = await this.prisma.channel.findMany({
      where: { ownerId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
    });
    return channels.map(this.toResponse);
  }

  async findAll(category?: string) {
    const channels = await this.prisma.channel.findMany({
      where: {
        isActive: true,
        ...(category && { category }),
      },
      orderBy: { subscribers: 'desc' },
    });
    return channels.map(this.toResponse);
  }

  async findOne(id: bigint) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    return this.toResponse(channel);
  }

  async update(userId: number, id: bigint, dto: UpdateChannelDto) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    if (channel.ownerId !== BigInt(userId)) {
      throw new ForbiddenException('Not the channel owner');
    }
    const updated = await this.prisma.channel.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.isActive !== undefined && { isActive: dto.isActive }),
      },
    });
    return this.toResponse(updated);
  }

  private toResponse(channel: {
    id: bigint;
    ownerId: bigint;
    username: string | null;
    title: string | null;
    category: string | null;
    subscribers: number | null;
    avgViews: number | null;
    isVerified: boolean;
    isActive: boolean;
    statsUpdatedAt: Date | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: channel.id.toString(),
      ownerId: channel.ownerId.toString(),
      username: channel.username,
      title: channel.title,
      category: channel.category,
      subscribers: channel.subscribers,
      avgViews: channel.avgViews,
      isVerified: channel.isVerified,
      isActive: channel.isActive,
      statsUpdatedAt: channel.statsUpdatedAt?.toISOString() ?? null,
      createdAt: channel.createdAt.toISOString(),
      updatedAt: channel.updatedAt.toISOString(),
    };
  }
}
