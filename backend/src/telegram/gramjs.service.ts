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
   * Get channel stats from a single GetHistory call: avg views (last 10 posts) and posts in last 7 days.
   * One API call for both. Returns nulls if user session not available or no data.
   */
  async getChannelHistoryStats(channelUsername: string): Promise<{
    avgViews: number | null;
    postsPerWeek: number | null;
  }> {
    if (!this.userSessionMode) {
      this.logger.warn('getChannelHistoryStats requires user session', 'GramJsService');
      return { avgViews: null, postsPerWeek: null };
    }
    try {
      const username = channelUsername.replace(/^@/, '');
      const resolved = await this.getClient().invoke(
        new Api.contacts.ResolveUsername({ username }),
      );
      const peer = resolved.peer;
      if (!(peer instanceof Api.PeerChannel)) {
        return { avgViews: null, postsPerWeek: null };
      }

      const result = await this.getClient().invoke(
        new Api.messages.GetHistory({
          peer,
          limit: 100,
          offsetId: 0,
          offsetDate: 0,
          addOffset: 0,
          maxId: 0,
          minId: 0,
          hash: BigInt(0) as unknown as Api.long,
        }),
      );

      const messages = 'messages' in result ? result.messages : [];
      const validMessages = messages.filter((m): m is Api.Message => m instanceof Api.Message);

      // Avg views: 10 most recent posts that have views
      const postsWithViews = validMessages
        .filter((m) => m.views !== undefined)
        .slice(0, 10);
      const avgViews =
        postsWithViews.length === 0
          ? null
          : Math.round(
              postsWithViews.reduce((sum, m) => sum + (m.views ?? 0), 0) / postsWithViews.length,
            );

      // Posts per week: count in last 7 days
      const sevenDaysAgo = Math.floor(Date.now() / 1000) - 7 * 24 * 60 * 60;
      const postsInLastWeek = validMessages.filter((m) => {
        const msgDate = typeof m.date === 'number' ? m.date : Number(m.date);
        return msgDate >= sevenDaysAgo;
      });
      const postsPerWeek = postsInLastWeek.length;

      return { avgViews, postsPerWeek };
    } catch (err) {
      this.logger.warn(
        `getChannelHistoryStats failed for ${channelUsername}: ${err instanceof Error ? err.message : String(err)}`,
        'GramJsService',
      );
      return { avgViews: null, postsPerWeek: null };
    }
  }

  /**
   * Get detailed broadcast stats for a channel (admin-only).
   * Returns language distribution, engagement rate, reach, and other metrics.
   * Requires user session and admin access to the channel.
   */
  async getChannelBroadcastStats(channelUsername: string): Promise<{
    languageDistribution: Record<string, number> | null;
    engagementRate: number | null;
    topPostsViews: number[] | null;
    avgReach: number | null;
    sharesPerPost: number | null;
    reactionsPerPost: number | null;
    notificationsEnabled: number | null;
  }> {
    if (!this.userSessionMode) {
      this.logger.warn('getChannelBroadcastStats requires user session', 'GramJsService');
      return {
        languageDistribution: null,
        engagementRate: null,
        topPostsViews: null,
        avgReach: null,
        sharesPerPost: null,
        reactionsPerPost: null,
        notificationsEnabled: null,
      };
    }

    try {
      const username = channelUsername.replace(/^@/, '');
      const resolved = await this.getClient().invoke(
        new Api.contacts.ResolveUsername({ username }),
      );
      const peer = resolved.peer;
      if (!(peer instanceof Api.PeerChannel)) {
        return {
          languageDistribution: null,
          engagementRate: null,
          topPostsViews: null,
          avgReach: null,
          sharesPerPost: null,
          reactionsPerPost: null,
          notificationsEnabled: null,
        };
      }

      const chat = resolved.chats.find(
        (c) => c instanceof Api.Channel && c.id.equals(peer.channelId),
      );
      if (!(chat instanceof Api.Channel)) {
        return {
          languageDistribution: null,
          engagementRate: null,
          topPostsViews: null,
          avgReach: null,
          sharesPerPost: null,
          reactionsPerPost: null,
          notificationsEnabled: null,
        };
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
        return {
          languageDistribution: null,
          engagementRate: null,
          topPostsViews: null,
          avgReach: null,
          sharesPerPost: null,
          reactionsPerPost: null,
          notificationsEnabled: null,
        };
      }

      this.logger.log(
        `getChannelBroadcastStats: channel ${channelUsername} has ${memberCount} members (>=500), fetching broadcast stats...`,
        'GramJsService',
      );

      const stats = await this.getClient().invoke(
        new Api.stats.GetBroadcastStats({ dark: false, channel: inputChannel }),
      );

      this.logger.log(
        `getChannelBroadcastStats: received stats for ${channelUsername}, processing...`,
        'GramJsService',
      );

      // Log raw stats response for debugging
      this.logger.log(
        `getChannelBroadcastStats: RAW STATS RESPONSE: ${JSON.stringify(stats, (key, value) => 
          typeof value === 'bigint' ? value.toString() : value
        , 2)}`,
        'GramJsService',
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
      if (stats.recentPostsInteractions && Array.isArray(stats.recentPostsInteractions)) {
        const posts = stats.recentPostsInteractions as Array<{
          views?: number;
          forwards?: number;
          reactions?: number;
        }>;
        let totalViews = 0;
        let totalEngagement = 0;
        for (const post of posts) {
          totalViews += post.views ?? 0;
          totalEngagement += (post.forwards ?? 0) + (post.reactions ?? 0);
        }
        if (totalViews > 0 && posts.length > 0) {
          engagementRate = (totalEngagement / totalViews) * 100;
          this.logger.log(
            `getChannelBroadcastStats: engagementRate calculated: ${engagementRate.toFixed(2)}% (${totalEngagement} interactions / ${totalViews} views from ${posts.length} posts)`,
            'GramJsService',
          );
        }
      }

      // Extract top posts views from recentPostsInteractions
      let topPostsViews: number[] | null = null;
      if (stats.recentPostsInteractions && Array.isArray(stats.recentPostsInteractions)) {
        topPostsViews = (stats.recentPostsInteractions as Array<{ views?: number }>)
          .map(post => post.views ?? 0)
          .filter(v => v > 0)
          .slice(0, 10);
        if (topPostsViews.length > 0) {
          this.logger.log(
            `getChannelBroadcastStats: topPostsViews extracted: ${topPostsViews.length} posts with views: ${JSON.stringify(topPostsViews)}`,
            'GramJsService',
          );
        }
      }

      // Extract additional metrics from raw stats
      const avgReach = (stats.viewsPerPost as { current?: number })?.current ?? null;
      const sharesPerPost = (stats.sharesPerPost as { current?: number })?.current ?? null;
      const reactionsPerPost = (stats.reactionsPerPost as { current?: number })?.current ?? null;
      const enabledNot = stats.enabledNotifications as { part?: number; total?: number } | undefined;
      const notificationsEnabled =
        enabledNot?.total && enabledNot.total > 0
          ? ((enabledNot.part ?? 0) / enabledNot.total) * 100
          : null;

      this.logger.log(
        `getChannelBroadcastStats: completed for ${channelUsername} - languageDistribution: ${!!languageDistribution}, engagementRate: ${engagementRate?.toFixed(2) ?? 'null'}%, topPostsViews: ${topPostsViews?.length ?? 0}, avgReach: ${avgReach}, sharesPerPost: ${sharesPerPost}, reactionsPerPost: ${reactionsPerPost}, notificationsEnabled: ${notificationsEnabled?.toFixed(1) ?? 'null'}%`,
        'GramJsService',
      );

      return {
        languageDistribution,
        engagementRate,
        topPostsViews,
        avgReach,
        sharesPerPost,
        reactionsPerPost,
        notificationsEnabled,
      };
    } catch (err) {
      this.logger.warn(
        `getChannelBroadcastStats failed for ${channelUsername}: ${err instanceof Error ? err.message : String(err)}`,
        'GramJsService',
      );
      return {
        languageDistribution: null,
        engagementRate: null,
        topPostsViews: null,
        avgReach: null,
        sharesPerPost: null,
        reactionsPerPost: null,
        notificationsEnabled: null,
      };
    }
  }

  /** Raw invoke – call any TL method directly */
  async invoke<T>(request: Api.AnyRequest): Promise<T> {
    return this.getClient().invoke(request) as Promise<T>;
  }
}
