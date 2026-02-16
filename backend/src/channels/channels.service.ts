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

    // 1. Verify bot is admin in channel (required for posting)
    this.logger.log('create: checking bot is admin in channel', LOG_CTX);
    const botId = await this.telegram.getBotId();
    try {
      const botIsAdmin = await this.telegram.isBotAdmin(chat.id, botId);
      this.logger.log(`create: bot isAdmin=${botIsAdmin} botId=${botId} chatId=${chat.id}`, LOG_CTX);
      if (!botIsAdmin) {
        throw new ForbiddenException(
          'Add the bot to the channel as an administrator, then try again.',
        );
      }
    } catch (e) {
      if (e instanceof ForbiddenException) throw e;
      const msg = e instanceof Error ? e.message : String(e);
      this.logger.log(`create: bot admin check failed ${msg}`, LOG_CTX);
      if (msg.includes('member list is inaccessible') || msg.includes('getChatMember failed')) {
        throw new BadRequestException(
          'Add the bot to the channel as an administrator, then try again.',
        );
      }
      throw e;
    }

    // 2. Verify requesting user is admin/owner of the channel (MTProto)
    if (this.gramjs.isReady()) {
      this.logger.log(`create: checking user ${userId} is admin via MTProto`, LOG_CTX);
      const userIsAdmin = await this.gramjs.isUserChannelAdmin(chat.id, userId);
      this.logger.log(`create: user ${userId} isAdmin=${userIsAdmin} in channel ${chat.id}`, LOG_CTX);
      if (!userIsAdmin) {
        throw new ForbiddenException(
          'You must be an admin or owner of this channel to add it.',
        );
      }
    } else {
      this.logger.warn('create: GramJS not available, skipping user ownership check', LOG_CTX);
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
    let postsPerWeek: number | null = null;
    let languageDistribution: Record<string, number> | null = null;
    let engagementRate: number | null = null;
    let topPostsViews: number[] | null = null;
    let avgReach: number | null = null;
    let sharesPerPost: number | null = null;
    let reactionsPerPost: number | null = null;
    let notificationsEnabled: number | null = null;

    if (this.gramjs.isReady() && this.gramjs.isUserSession() && chat.username) {
      this.logger.log(`create: fetching extended stats for @${chat.username}`, LOG_CTX);

      // One GetHistory call for avgViews + postsPerWeek
      const historyStats = await this.gramjs.getChannelHistoryStats(chat.username);
      avgViews = historyStats.avgViews;
      postsPerWeek = historyStats.postsPerWeek;
      this.logger.log(`create: avgViews=${avgViews} postsPerWeek=${postsPerWeek}`, LOG_CTX);

      // Get broadcast stats (language, engagement, reach, etc.)
      const broadcastStats = await this.gramjs.getChannelBroadcastStats(chat.username);
      languageDistribution = broadcastStats.languageDistribution;
      engagementRate = broadcastStats.engagementRate;
      topPostsViews = broadcastStats.topPostsViews;
      avgReach = broadcastStats.avgReach;
      sharesPerPost = broadcastStats.sharesPerPost;
      reactionsPerPost = broadcastStats.reactionsPerPost;
      notificationsEnabled = broadcastStats.notificationsEnabled;
      this.logger.log(
        `create: broadcastStats languageDistribution=${!!languageDistribution} engagementRate=${engagementRate} topPostsViews=${topPostsViews?.length ?? 0} avgReach=${avgReach} sharesPerPost=${sharesPerPost} reactionsPerPost=${reactionsPerPost} notificationsEnabled=${notificationsEnabled?.toFixed(1) ?? 'null'}%`,
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
        postsPerWeek,
        languageDistribution: languageDistribution as any,
        engagementRate,
        topPostsViews: topPostsViews as any,
        avgReach,
        sharesPerPost,
        reactionsPerPost,
        notificationsEnabled,
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
    let postsPerWeek: number | null = null;
    let languageDistribution: Record<string, number> | null = null;
    let engagementRate: number | null = null;
    let topPostsViews: number[] | null = null;
    let avgReach: number | null = null;
    let sharesPerPost: number | null = null;
    let reactionsPerPost: number | null = null;
    let notificationsEnabled: number | null = null;

    if (this.gramjs.isUserSession()) {
      const historyStats = await this.gramjs.getChannelHistoryStats(channel.username);
      avgViews = historyStats.avgViews;
      postsPerWeek = historyStats.postsPerWeek;
      const broadcastStats = await this.gramjs.getChannelBroadcastStats(channel.username);
      languageDistribution = broadcastStats.languageDistribution;
      engagementRate = broadcastStats.engagementRate;
      topPostsViews = broadcastStats.topPostsViews;
      avgReach = broadcastStats.avgReach;
      sharesPerPost = broadcastStats.sharesPerPost;
      reactionsPerPost = broadcastStats.reactionsPerPost;
      notificationsEnabled = broadcastStats.notificationsEnabled;
    }

    await this.prisma.channel.update({
      where: { id },
      data: {
        subscribers: stats.subscriberCount,
        statsUpdatedAt: new Date(),
        ...(avgViews !== null && { avgViews }),
        ...(postsPerWeek !== null && { postsPerWeek }),
        ...(languageDistribution && { languageDistribution: languageDistribution as any }),
        ...(engagementRate !== null && { engagementRate }),
        ...(topPostsViews && { topPostsViews: topPostsViews as any }),
        ...(avgReach !== null && { avgReach }),
        ...(sharesPerPost !== null && { sharesPerPost }),
        ...(reactionsPerPost !== null && { reactionsPerPost }),
        ...(notificationsEnabled !== null && { notificationsEnabled }),
      },
    });

    return {
      channelId: channel.id.toString(),
      username: channel.username,
      subscriberCount: stats.subscriberCount,
      avgViews,
      postsPerWeek,
      languageDistribution,
      engagementRate,
      topPostsViews,
      avgReach,
      sharesPerPost,
      reactionsPerPost,
      notificationsEnabled,
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
    avgReach: number | null;
    sharesPerPost: number | null;
    reactionsPerPost: number | null;
    notificationsEnabled: number | null;
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
      avgReach: channel.avgReach,
      sharesPerPost: channel.sharesPerPost,
      reactionsPerPost: channel.reactionsPerPost,
      notificationsEnabled: channel.notificationsEnabled,
      createdAt: channel.createdAt.toISOString(),
      updatedAt: channel.updatedAt.toISOString(),
    };
  }
}
