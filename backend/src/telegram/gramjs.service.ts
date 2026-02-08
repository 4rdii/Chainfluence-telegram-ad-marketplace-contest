import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class GramJsService implements OnModuleInit, OnModuleDestroy {
  private client!: TelegramClient;
  private ready = false;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    const apiId = this.config.get<number>('telegram.apiId');
    const apiHash = this.config.get<string>('telegram.apiHash');
    const botToken = this.config.get<string>('telegram.botToken');

    if (!apiId || !apiHash || !botToken) {
      this.logger.warn(
        'TELEGRAM_API_ID, TELEGRAM_API_HASH or TELEGRAM_BOT_TOKEN not set – GramJS client disabled',
        'GramJsService',
      );
      return;
    }

    const stringSession = new StringSession('');
    this.client = new TelegramClient(stringSession, apiId, apiHash, {
      connectionRetries: 5,
    });

    await this.client.start({ botAuthToken: botToken });
    this.ready = true;
    this.logger.log('GramJS client connected via MTProto', 'GramJsService');
  }

  async onModuleDestroy() {
    if (this.ready && this.client) {
      await this.client.disconnect();
      this.logger.log('GramJS client disconnected', 'GramJsService');
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  getClient(): TelegramClient {
    if (!this.ready) {
      throw new Error('GramJS client is not initialized');
    }
    return this.client;
  }

  /** Get full channel info: subscribers, description, linked chat, etc. */
  async getFullChannel(channel: string | Api.TypeInputChannel) {
    return this.getClient().invoke(
      new Api.channels.GetFullChannel({ channel }),
    );
  }

  /** Get channel message history */
  async getMessages(
    peer: string | Api.TypeInputPeer,
    limit = 10,
    offsetId = 0,
  ) {
    return this.getClient().invoke(
      new Api.messages.GetHistory({
        peer,
        limit,
        offsetId,
        offsetDate: 0,
        addOffset: 0,
        maxId: 0,
        minId: 0,
        hash: BigInt(0) as unknown as Api.long,
      }),
    );
  }

  /** Resolve a @username to its full entity */
  async resolveUsername(username: string) {
    return this.getClient().invoke(
      new Api.contacts.ResolveUsername({
        username: username.replace('@', ''),
      }),
    );
  }

  /** Get message views for specific message IDs in a channel */
  async getMessagesViews(peer: string | Api.TypeInputPeer, id: number[]) {
    return this.getClient().invoke(
      new Api.messages.GetMessagesViews({ peer, id, increment: false }),
    );
  }

  /**
   * Fetch channel stats used by the marketplace:
   * - subscriberCount
   * - avgViews (average views of last 10 posts)
   * - postsPerWeek
   * - engagementRate (avgViews / subscriberCount)
   */
  async getChannelStats(channelUsername: string) {
    const peer = channelUsername.startsWith('@')
      ? channelUsername
      : `@${channelUsername}`;

    // 1. Get subscriber count from fullChat
    const fullChannel = await this.getClient().invoke(
      new Api.channels.GetFullChannel({ channel: peer }),
    );
    const fullChat = fullChannel.fullChat as Api.ChannelFull;
    const subscriberCount = fullChat.participantsCount ?? 0;

    // 2. Get last 50 posts to calculate avg views & posts per week
    const history = await this.getClient().invoke(
      new Api.messages.GetHistory({
        peer,
        limit: 50,
        offsetId: 0,
        offsetDate: 0,
        addOffset: 0,
        maxId: 0,
        minId: 0,
        hash: BigInt(0) as unknown as Api.long,
      }),
    );

    const messages =
      'messages' in history
        ? (history.messages as Api.Message[]).filter(
            (m) => m.className === 'Message',
          )
        : [];

    // Average views from last 10 posts
    const recentPosts = messages.slice(0, 10);
    const totalViews = recentPosts.reduce((sum, m) => sum + (m.views ?? 0), 0);
    const avgViews =
      recentPosts.length > 0 ? Math.round(totalViews / recentPosts.length) : 0;

    // Posts per week: count posts in the last 7 days from the fetched batch
    const oneWeekAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
    const postsPerWeek = messages.filter(
      (m) => m.date && m.date >= oneWeekAgo,
    ).length;

    // Engagement rate
    const engagementRate =
      subscriberCount > 0
        ? parseFloat((avgViews / subscriberCount).toFixed(4))
        : 0;

    return { subscriberCount, avgViews, postsPerWeek, engagementRate };
  }

  /** Raw invoke – call any TL method directly */
  async invoke<T>(request: Api.AnyRequest): Promise<T> {
    return this.getClient().invoke(request) as Promise<T>;
  }
}
