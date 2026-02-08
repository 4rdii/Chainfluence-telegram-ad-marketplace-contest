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

  /** Raw invoke – call any TL method directly */
  async invoke<T>(request: Api.AnyRequest): Promise<T> {
    return this.getClient().invoke(request) as Promise<T>;
  }
}
