import {
  BadRequestException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramApiService } from '../telegram/telegram-api.service';
import { GramJsService } from '../telegram/gramjs.service';
import { LoggerService } from '../logger/logger.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

const LOG_CTX = 'ChannelsService';

@Injectable()
export class ChannelsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly telegram: TelegramApiService,
    private readonly gramjs: GramJsService,
    private readonly logger: LoggerService,
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
    this.logger.log(
      `POST /channels create: userId=${userId} payload=${JSON.stringify(dto)}`,
      LOG_CTX,
    );

    const raw = dto.channelId ?? dto.username;
    const chatId = this.normalizeChatId(raw);
    if (chatId === undefined) {
      this.logger.warn('create: missing channelId/username', LOG_CTX);
      throw new BadRequestException('channelId or username is required');
    }

    let chat;
    try {
      chat = await this.telegram.getChat(chatId);
      this.logger.log(
        `create: getChat ok id=${chat.id} username=${chat.username ?? 'null'} title=${chat.title ?? 'null'}`,
        LOG_CTX,
      );
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.log(`create: getChat failed ${msg}`, LOG_CTX);
      if (msg.includes('chat not found')) {
        throw new BadRequestException(
          'Channel not found. Use the channel @username (e.g. @mychannel) for public channels, or the numeric ID if private. Ensure the bot is added to the channel as an admin.',
        );
      }
      throw e;
    }

    const gramjsReady = this.gramjs.isReady();
    const gramjsUserSession = this.gramjs.isUserSession();
    const hasUsername = !!chat.username;
    const useSession = gramjsReady && gramjsUserSession && hasUsername;

    this.logger.log(
      `create: verification path decision gramjsReady=${gramjsReady} gramjsUserSession=${gramjsUserSession} hasUsername=${hasUsername} => useSession=${useSession}`,
      LOG_CTX,
    );

    let isAdmin: boolean;
    if (useSession) {
      this.logger.log('create: using Telegram session (MTProto) to check admin', LOG_CTX);
      try {
        isAdmin = await this.gramjs.isSessionUserChannelAdmin(chat.username);
        this.logger.log(`create: session user isAdmin=${isAdmin} for @${chat.username}`, LOG_CTX);
      } catch (err) {
        isAdmin = false;
        this.logger.log(
          `create: session admin check threw ${err instanceof Error ? err.message : String(err)}`,
          LOG_CTX,
        );
      }
      if (!isAdmin) {
        this.logger.warn('create: session user is not admin, rejecting', LOG_CTX);
        throw new ForbiddenException(
          'Add our verification account as an administrator to the channel, then try again.',
        );
      }
    } else {
      this.logger.log('create: using Bot API to check admin (session not used)', LOG_CTX);
      const botId = await this.telegram.getBotId();
      try {
        isAdmin = await this.telegram.isBotAdmin(chat.id, botId);
        this.logger.log(`create: bot isAdmin=${isAdmin} botId=${botId} chatId=${chat.id}`, LOG_CTX);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        this.logger.log(`create: bot admin check failed ${msg}`, LOG_CTX);
        if (msg.includes('member list is inaccessible') || msg.includes('getChatMember failed')) {
          throw new BadRequestException(
            'Add the bot to the channel as an administrator, then try again.',
          );
        }
        throw e;
      }
      if (!isAdmin) {
        this.logger.warn('create: bot is not admin, rejecting', LOG_CTX);
        throw new ForbiddenException(
          'Add the bot to the channel as an administrator, then try again.',
        );
      }
    }

    const id = BigInt(chat.id);
    const existing = await this.prisma.channel.findUnique({
      where: { id },
    });
    if (existing) {
      if (existing.ownerId !== BigInt(userId)) {
        this.logger.warn(`create: channel ${id} already owned by another user`, LOG_CTX);
        throw new ForbiddenException('Channel already added by another user');
      }
      this.logger.log(`create: returning existing channel id=${id}`, LOG_CTX);
      return this.toResponse(existing);
    }

    // Fetch extended stats if GramJS user session is available and channel has username
    let avgViews: number | null = null;
    let languageDistribution: Record<string, number> | null = null;
    let engagementRate: number | null = null;
    let topPostsViews: number[] | null = null;

    if (this.gramjs.isReady() && this.gramjs.isUserSession() && chat.username) {
      this.logger.log(`create: fetching extended stats for @${chat.username}`, LOG_CTX);

      // Get average views from recent posts
      avgViews = await this.gramjs.getChannelAverageViews(chat.username);
      this.logger.log(`create: avgViews=${avgViews}`, LOG_CTX);

      // Get broadcast stats (language, engagement, etc.)
      const broadcastStats = await this.gramjs.getChannelBroadcastStats(chat.username);
      languageDistribution = broadcastStats.languageDistribution;
      engagementRate = broadcastStats.engagementRate;
      topPostsViews = broadcastStats.topPostsViews;
      this.logger.log(
        `create: broadcastStats languageDistribution=${!!languageDistribution} engagementRate=${engagementRate} topPostsViews=${topPostsViews?.length ?? 0}`,
        LOG_CTX,
      );
    }

    const channel = await this.prisma.channel.create({
      data: {
        id,
        ownerId: BigInt(userId),
        username: chat.username ?? null,
        title: chat.title ?? null,
        isVerified: true,
        statsUpdatedAt: new Date(),
        avgViews,
        languageDistribution: languageDistribution as any,
        engagementRate,
        topPostsViews: topPostsViews as any,
      },
    });
    this.logger.log(`create: created channel id=${id} username=${channel.username}`, LOG_CTX);
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

    // Get basic subscriber count
    const stats = await this.gramjs.getChannelStats(channel.username);

    // Get extended stats if user session is available
    let avgViews: number | null = null;
    let languageDistribution: Record<string, number> | null = null;
    let engagementRate: number | null = null;
    let topPostsViews: number[] | null = null;

    if (this.gramjs.isUserSession()) {
      avgViews = await this.gramjs.getChannelAverageViews(channel.username);
      const broadcastStats = await this.gramjs.getChannelBroadcastStats(channel.username);
      languageDistribution = broadcastStats.languageDistribution;
      engagementRate = broadcastStats.engagementRate;
      topPostsViews = broadcastStats.topPostsViews;
    }

    await this.prisma.channel.update({
      where: { id },
      data: {
        subscribers: stats.subscriberCount,
        statsUpdatedAt: new Date(),
        ...(avgViews !== null && { avgViews }),
        ...(languageDistribution && { languageDistribution: languageDistribution as any }),
        ...(engagementRate !== null && { engagementRate }),
        ...(topPostsViews && { topPostsViews: topPostsViews as any }),
      },
    });

    return {
      channelId: channel.id.toString(),
      username: channel.username,
      subscriberCount: stats.subscriberCount,
      avgViews,
      languageDistribution,
      engagementRate,
      topPostsViews,
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
    languageDistribution: any;
    topPostsViews: any;
    engagementRate: number | null;
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
      languageDistribution: channel.languageDistribution,
      topPostsViews: channel.topPostsViews,
      engagementRate: channel.engagementRate,
      createdAt: channel.createdAt.toISOString(),
      updatedAt: channel.updatedAt.toISOString(),
    };
  }
}
