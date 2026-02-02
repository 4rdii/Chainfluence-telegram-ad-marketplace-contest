import crypto from 'crypto';
import { ContentVerification } from './types';

const TELEGRAM_API_BASE = 'https://api.telegram.org/bot';

interface TelegramError {
  ok: false;
  error_code: number;
  description: string;
}

interface TelegramSuccess<T> {
  ok: true;
  result: T;
}

type TelegramResponse<T> = TelegramSuccess<T> | TelegramError;

interface Message {
  message_id: number;
  text?: string;
  caption?: string;
  photo?: { file_id: string }[];
  date: number;
  edit_date?: number;
}

/**
 * Compute content hash from message text/caption
 * This should match the hash computation on the frontend
 */
export function computeContentHash(content: string): bigint {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return BigInt('0x' + hash);
}

/**
 * Telegram Bot API client for TEE
 */
export class TelegramBotApi {
  private botToken: string;
  private verificationChatId: number; // Private chat/channel where bot forwards messages for verification

  constructor(botToken: string, verificationChatId: number) {
    this.botToken = botToken;
    this.verificationChatId = verificationChatId;
  }

  private async request<T>(method: string, params: Record<string, unknown> = {}): Promise<T> {
    const url = `${TELEGRAM_API_BASE}${this.botToken}/${method}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = (await response.json()) as TelegramResponse<T>;

    if (!data.ok) {
      throw new Error(`Telegram API error: ${data.description} (${data.error_code})`);
    }

    return data.result;
  }

  /**
   * Forward a message to verification chat to check if it exists
   * Returns the forwarded message if successful
   */
  async forwardMessage(channelId: number, messageId: number): Promise<Message | null> {
    try {
      return await this.request<Message>('forwardMessage', {
        chat_id: this.verificationChatId,
        from_chat_id: channelId,
        message_id: messageId,
      });
    } catch (error) {
      // Message doesn't exist or was deleted
      if (error instanceof Error && error.message.includes('message to forward not found')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Copy a message (doesn't show "forwarded from")
   * Alternative to forwardMessage for verification
   */
  async copyMessage(channelId: number, messageId: number): Promise<{ message_id: number } | null> {
    try {
      return await this.request<{ message_id: number }>('copyMessage', {
        chat_id: this.verificationChatId,
        from_chat_id: channelId,
        message_id: messageId,
      });
    } catch (error) {
      if (error instanceof Error && error.message.includes('message to copy not found')) {
        return null;
      }
      throw error;
    }
  }

  /**
   * Delete a message from verification chat (cleanup after verification)
   */
  async deleteMessage(messageId: number): Promise<void> {
    try {
      await this.request('deleteMessage', {
        chat_id: this.verificationChatId,
        message_id: messageId,
      });
    } catch {
      // Ignore deletion errors
    }
  }

  /**
   * Verify that a post exists and matches expected content hash
   */
  async verifyContent(
    channelId: number,
    postId: number,
    expectedContentHash: bigint
  ): Promise<ContentVerification> {
    // Forward the message to our verification chat
    const forwarded = await this.forwardMessage(channelId, postId);

    if (!forwarded) {
      return { exists: false };
    }

    // Get content from the forwarded message
    const content = forwarded.text || forwarded.caption || '';
    const actualHash = computeContentHash(content);

    // Cleanup: delete the forwarded message
    await this.deleteMessage(forwarded.message_id);

    return {
      exists: true,
      contentHash: actualHash,
      edited: forwarded.edit_date !== undefined,
    };
  }

  /**
   * Check if post still exists with original content
   * Used by checkDeal to determine release/refund
   */
  async checkPostStatus(
    channelId: number,
    postId: number,
    expectedContentHash: bigint
  ): Promise<'valid' | 'deleted' | 'modified'> {
    const verification = await this.verifyContent(channelId, postId, expectedContentHash);

    if (!verification.exists) {
      return 'deleted';
    }

    if (verification.contentHash !== expectedContentHash) {
      return 'modified';
    }

    return 'valid';
  }
}
