import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramApiService } from '../telegram/telegram-api.service';
import { GramJsService } from '../telegram/gramjs.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramApiService,
    private readonly gramjs: GramJsService,
  ) {}

  /** Normalize channel identifier for Telegram API: username must be @username. */
  private normalizeChatId(channelId: number | string | undefined): number | string | undefined {
    if (channelId === undefined) return undefined;
    if (typeof channelId === 'number') return channelId;
    const s = String(channelId).trim();
    if (!s) return undefined;
    if (/^-?\d+$/.test(s)) return parseInt(s, 10);
    return s.startsWith('@') ? s : `@${s}`;
  }

  async create(userId: number, dto: CreateChannelDto) {
    const raw = dto.channelId ?? dto.username;
    const chatId = this.normalizeChatId(raw);
    if (chatId === undefined) {
      throw new BadRequestException('channelId or username is required');
    }
    let chat;
    try {
      chat = await this.telegram.getChat(chatId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('chat not found')) {
        throw new BadRequestException(
          'Channel not found. Use the channel @username (e.g. @mychannel) for public channels, or the numeric ID if private. Ensure the bot is added to the channel as an admin.',
        );
      }
      throw e;
    }
    const botId = await this.telegram.getBotId();
    let isAdmin: boolean;
    try {
      isAdmin = await this.telegram.isBotAdmin(chat.id, botId);
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      if (msg.includes('member list is inaccessible') || msg.includes('getChatMember failed')) {
        throw new BadRequestException(
          'Add the bot to the channel as an administrator, then try again.',
        );
      }
      throw e;
    }
    if (!isAdmin) {
      throw new ForbiddenException(
        'Add the bot to the channel as an administrator, then try again.',
      );
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
        ...(dto.avgViews !== undefined && { avgViews: dto.avgViews }),
        ...(dto.postsPerWeek !== undefined && { postsPerWeek: dto.postsPerWeek }),
        ...(dto.pricing !== undefined && { pricing: dto.pricing }),
      },
    });
    return this.toResponse(updated);
  }

  async remove(userId: number, id: bigint) {
    const channel = await this.prisma.channel.findUnique({
      where: { id },
    });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    if (channel.ownerId !== BigInt(userId)) {
      throw new ForbiddenException('Not the channel owner');
    }
    await this.prisma.channel.delete({
      where: { id },
    });
    return { message: 'Channel deleted successfully' };
  }

  async getStats(id: bigint) {
    if (!this.gramjs.isReady()) {
      throw new BadRequestException(
        'MTProto client is not configured. Set TELEGRAM_API_ID and TELEGRAM_API_HASH.',
      );
    }

    const channel = await this.prisma.channel.findUnique({ where: { id } });
    if (!channel) {
      throw new NotFoundException('Channel not found');
    }
    if (!channel.username) {
      throw new BadRequestException(
        'Channel has no username – stats require a public channel username.',
      );
    }

    const stats = await this.gramjs.getChannelStats(channel.username);

    await this.prisma.channel.update({
      where: { id },
      data: {
        subscribers: stats.subscriberCount,
        statsUpdatedAt: new Date(),
      },
    });

    return {
      channelId: channel.id.toString(),
      username: channel.username,
      subscriberCount: stats.subscriberCount,
    };
  }

  private toResponse(channel: {
    id: bigint;
    ownerId: bigint;
    username: string | null;
    title: string | null;
    category: string | null;
    subscribers: number | null;
    avgViews: number | null;
    postsPerWeek: number | null;
    pricing: any;
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
      postsPerWeek: channel.postsPerWeek,
      pricing: channel.pricing,
      isVerified: channel.isVerified,
      isActive: channel.isActive,
      statsUpdatedAt: channel.statsUpdatedAt?.toISOString() ?? null,
      createdAt: channel.createdAt.toISOString(),
      updatedAt: channel.updatedAt.toISOString(),
    };
  }
}
