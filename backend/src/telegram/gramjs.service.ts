import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { TelegramClient, Api } from 'telegram';
import { StringSession } from 'telegram/sessions';
import { LoggerService } from '../logger/logger.service';

@Injectable()
export class GramJsService implements OnModuleInit, OnModuleDestroy {
  private client!: TelegramClient;
  private ready = false;
  private userSessionMode = false;

  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  async onModuleInit() {
    const apiId = this.config.get<number>('telegram.apiId');
    const apiHash = this.config.get<string>('telegram.apiHash');
    const sessionString = this.config.get<string>('telegram.sessionString');
    const botToken = this.config.get<string>('telegram.botToken');

    if (!apiId || !apiHash) {
      this.logger.warn(
        'TELEGRAM_API_ID or TELEGRAM_API_HASH not set – GramJS client disabled',
        'GramJsService',
      );
      return;
    }

    this.client = new TelegramClient(
      new StringSession(sessionString ?? ''),
      apiId,
      apiHash,
      { connectionRetries: 5 },
    );

    if (sessionString?.trim()) {
      await this.client.connect();
      this.userSessionMode = true;
      this.logger.log('GramJS client connected via user session (MTProto)', 'GramJsService');
    } else if (botToken) {
      await this.client.start({ botAuthToken: botToken });
      this.logger.log('GramJS client connected via MTProto', 'GramJsService');
    } else {
      this.logger.warn(
        'TELEGRAM_SESSION_STRING or TELEGRAM_BOT_TOKEN required – GramJS client disabled',
        'GramJsService',
      );
      return;
    }

    this.ready = true;
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

  isUserSession(): boolean {
    return this.ready && this.userSessionMode;
  }

  getClient(): TelegramClient {
    if (!this.ready) {
      throw new Error('GramJS client is not initialized');
    }
    return this.client;
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
   * Get specific channel messages by ID. Allowed for bots (unlike messages.GetHistory).
   * Use this when you already have message IDs (e.g. from deal verification, stored post IDs).
   * Returns messages with views; pass messageIds from your DB or from channel post links.
   */
  async getChannelMessagesByIds(
    channelUsername: string,
    messageIds: number[],
  ): Promise<Api.Message[]> {
    if (messageIds.length === 0) return [];
    const peer = channelUsername.startsWith('@')
      ? channelUsername
      : `@${channelUsername}`;
    const id = messageIds.map((n) => new Api.InputMessageID({ id: n }));
    const result = await this.getClient().invoke(
      new Api.channels.GetMessages({ channel: peer, id }),
    );
    const messages =
      'messages' in result ? (result.messages as Api.Message[]) : [];
    return messages.filter((m) => m.className === 'Message');
  }

  /**
   * Check if the current (session) user is admin or creator in the channel.
   * Only valid when isUserSession() is true. Use for channel verification.
   */
  async isSessionUserChannelAdmin(channelUsername: string): Promise<boolean> {
    if (!this.userSessionMode) return false;
    const username = channelUsername.replace(/^@/, '');
    const resolved = await this.getClient().invoke(
      new Api.contacts.ResolveUsername({ username }),
    );
    const peer = resolved.peer;
    if (!(peer instanceof Api.PeerChannel)) return false;
    const chat = resolved.chats.find(
      (c) => c instanceof Api.Channel && c.id.equals(peer.channelId),
    );
    if (!(chat instanceof Api.Channel)) return false;
    const inputChannel = new Api.InputChannel({
      channelId: chat.id,
      accessHash: (chat.accessHash ?? BigInt(0)) as Api.long,
    });
    const result = await this.getClient().invoke(
      new Api.channels.GetParticipant({
        channel: inputChannel,
        participant: new Api.InputPeerSelf(),
      }),
    );
    const p = (result as { participant?: Api.TypeChannelParticipant }).participant;
    return (
      p instanceof Api.ChannelParticipantAdmin || p instanceof Api.ChannelParticipantCreator
    );
  }

  /**
   * Fetch channel subscriber count (channels.GetFullChannel – bot allowed).
   * Resolve username via contacts.ResolveUsername first so we never pass a string
   * to GetFullChannel; passing a string can cause the client to resolve the peer
   * in a way that triggers messages.GetHistory, which bots cannot use (BOT_METHOD_INVALID).
   */
  async getChannelStats(
    channelUsername: string,
  ): Promise<{ subscriberCount: number }> {
    const username = channelUsername.replace(/^@/, '');
    const resolved = await this.getClient().invoke(
      new Api.contacts.ResolveUsername({ username }),
    );
    const peer = resolved.peer;
    if (!(peer instanceof Api.PeerChannel)) {
      throw new Error(`Resolved "${channelUsername}" is not a channel`);
    }
    const chat = resolved.chats.find(
      (c) => c instanceof Api.Channel && c.id.equals(peer.channelId),
    );
    if (!(chat instanceof Api.Channel)) {
      throw new Error(`Channel not found for "${channelUsername}"`);
    }
    const inputChannel = new Api.InputChannel({
      channelId: chat.id,
      accessHash: (chat.accessHash ?? BigInt(0)) as Api.long,
    });
    const fullChannel = await this.getClient().invoke(
      new Api.channels.GetFullChannel({ channel: inputChannel }),
    );
    const fullChat = fullChannel.fullChat as Api.ChannelFull;
    const subscriberCount = fullChat.participantsCount ?? 0;
    return { subscriberCount };
  }

  /**
   * Get average views from the latest posts in a channel (uses GetHistory).
   * Fetches up to 30 recent messages, filters for posts with views, takes the 10 most recent.
   * Returns null if user session is not available (GetHistory requires user session).
   */
  async getChannelAverageViews(channelUsername: string): Promise<number | null> {
    if (!this.userSessionMode) {
      this.logger.warn('getChannelAverageViews requires user session', 'GramJsService');
      return null;
    }
    try {
      const username = channelUsername.replace(/^@/, '');
      const resolved = await this.getClient().invoke(
        new Api.contacts.ResolveUsername({ username }),
      );
      const peer = resolved.peer;
      if (!(peer instanceof Api.PeerChannel)) return null;

      const result = await this.getClient().invoke(
        new Api.messages.GetHistory({
          peer,
          limit: 30,
          offsetId: 0,
          offsetDate: 0,
          addOffset: 0,
          maxId: 0,
          minId: 0,
          hash: BigInt(0) as unknown as Api.long,
        }),
      );

      const messages = 'messages' in result ? result.messages : [];
      const postsWithViews = messages
        .filter((m): m is Api.Message => m instanceof Api.Message && m.views !== undefined)
        .slice(0, 10);

      if (postsWithViews.length === 0) return null;

      const totalViews = postsWithViews.reduce((sum, m) => sum + (m.views ?? 0), 0);
      return Math.round(totalViews / postsWithViews.length);
    } catch (err) {
      this.logger.warn(
        `getChannelAverageViews failed for ${channelUsername}: ${err instanceof Error ? err.message : String(err)}`,
        'GramJsService',
      );
      return null;
    }
  }

  /**
   * Get detailed broadcast stats for a channel (admin-only).
   * Returns language distribution, engagement rate, and top posts views.
   * Requires user session and admin access to the channel.
   */
  async getChannelBroadcastStats(channelUsername: string): Promise<{
    languageDistribution: Record<string, number> | null;
    engagementRate: number | null;
    topPostsViews: number[] | null;
  }> {
    if (!this.userSessionMode) {
      this.logger.warn('getChannelBroadcastStats requires user session', 'GramJsService');
      return { languageDistribution: null, engagementRate: null, topPostsViews: null };
    }

    try {
      const username = channelUsername.replace(/^@/, '');
      const resolved = await this.getClient().invoke(
        new Api.contacts.ResolveUsername({ username }),
      );
      const peer = resolved.peer;
      if (!(peer instanceof Api.PeerChannel)) {
        return { languageDistribution: null, engagementRate: null, topPostsViews: null };
      }

      const chat = resolved.chats.find(
        (c) => c instanceof Api.Channel && c.id.equals(peer.channelId),
      );
      if (!(chat instanceof Api.Channel)) {
        return { languageDistribution: null, engagementRate: null, topPostsViews: null };
      }

      const inputChannel = new Api.InputChannel({
        channelId: chat.id,
        accessHash: (chat.accessHash ?? BigInt(0)) as Api.long,
      });

      // Check if channel has stats available (requires 500+ members for broadcast channels)
      const fullChannel = await this.getClient().invoke(
        new Api.channels.GetFullChannel({ channel: inputChannel }),
      );
      const fullChat = fullChannel.fullChat as Api.ChannelFull;
      const memberCount = fullChat.participantsCount ?? 0;

      this.logger.log(
        `getChannelBroadcastStats: channel ${channelUsername} has ${memberCount} members, canViewStats=${fullChat.canViewStats ?? false}`,
        'GramJsService',
      );

      if (memberCount < 500) {
        this.logger.warn(
          `getChannelBroadcastStats: channel ${channelUsername} has ${memberCount} members (need 500+ for stats)`,
          'GramJsService',
        );
        return { languageDistribution: null, engagementRate: null, topPostsViews: null };
      }

      const stats = await this.getClient().invoke(
        new Api.stats.GetBroadcastStats({ dark: false, channel: inputChannel }),
      );

      // Extract language distribution from followers_graph
      let languageDistribution: Record<string, number> | null = null;
      const langGraph = stats.languagesGraph as { jsonData?: string } | undefined;
      if (langGraph?.jsonData) {
        try {
          const data = JSON.parse(langGraph.jsonData) as {
            language_codes?: string[];
            percentages?: number[];
          };
          if (data?.language_codes && data?.percentages) {
            languageDistribution = {};
            for (let i = 0; i < data.language_codes.length; i++) {
              languageDistribution[data.language_codes[i]] = data.percentages[i] ?? 0;
            }
          }
        } catch {
          // JSON parse failed
        }
      }

      // Calculate engagement rate from recent posts
      let engagementRate: number | null = null;
      if (stats.recentPostsInteractions && 'data' in stats.recentPostsInteractions) {
        const recentData = stats.recentPostsInteractions.data as any;
        if (recentData && recentData.rows && Array.isArray(recentData.rows)) {
          const rows = recentData.rows as any[];
          let totalEngagement = 0;
          let totalViews = 0;
          for (const row of rows) {
            if (Array.isArray(row.columns) && row.columns.length >= 2) {
              const views = row.columns[0] || 0;
              const interactions = row.columns[1] || 0;
              totalViews += views;
              totalEngagement += interactions;
            }
          }
          if (totalViews > 0) {
            engagementRate = (totalEngagement / totalViews) * 100;
          }
        }
      }

      // Extract top posts views
      let topPostsViews: number[] | null = null;
      if (stats.topHoursGraph && 'data' in stats.topHoursGraph) {
        const topData = stats.topHoursGraph.data as any;
        if (topData && topData.rows && Array.isArray(topData.rows)) {
          topPostsViews = (topData.rows as any[])
            .map(row => (Array.isArray(row.columns) && row.columns[0]) || 0)
            .slice(0, 10);
        }
      }

      return { languageDistribution, engagementRate, topPostsViews };
    } catch (err) {
      this.logger.warn(
        `getChannelBroadcastStats failed for ${channelUsername}: ${err instanceof Error ? err.message : String(err)}`,
        'GramJsService',
      );
      return { languageDistribution: null, engagementRate: null, topPostsViews: null };
    }
  }

  /** Raw invoke – call any TL method directly */
  async invoke<T>(request: Api.AnyRequest): Promise<T> {
    return this.getClient().invoke(request) as Promise<T>;
  }
}
