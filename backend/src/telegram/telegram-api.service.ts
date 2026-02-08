import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

interface TelegramChat {
  id: number;
  title?: string;
  username?: string;
  type: string;
}

interface TelegramChatMember {
  status: string;
  user: { id: number; username?: string };
}

@Injectable()
export class TelegramApiService {
  private baseUrl: string;

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>('telegram.botToken');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  async getChat(chatId: number | string): Promise<TelegramChat> {
    const res = await fetch(
      `${this.baseUrl}/getChat?chat_id=${encodeURIComponent(chatId)}`,
    );
    const data = (await res.json()) as { ok: boolean; result?: TelegramChat };
    if (!data.ok || !data.result) {
      throw new Error(`getChat failed: ${JSON.stringify(data)}`);
    }
    return data.result;
  }

  async getChatAdministrators(chatId: number | string): Promise<TelegramChatMember[]> {
    const res = await fetch(
      `${this.baseUrl}/getChatAdministrators?chat_id=${encodeURIComponent(chatId)}`,
    );
    const data = (await res.json()) as {
      ok: boolean;
      result?: TelegramChatMember[];
      error_code?: number;
      description?: string;
    };
    if (!data.ok || !data.result) {
      throw new Error(`getChatAdministrators failed: ${JSON.stringify(data)}`);
    }
    return data.result;
  }

  /** Get a single chat member. Use this to check if the bot is in the channel (avoids "member list is inaccessible"). */
  async getChatMember(chatId: number | string, userId: number): Promise<TelegramChatMember | null> {
    const res = await fetch(
      `${this.baseUrl}/getChatMember?chat_id=${encodeURIComponent(chatId)}&user_id=${userId}`,
    );
    const data = (await res.json()) as {
      ok: boolean;
      result?: TelegramChatMember;
      error_code?: number;
      description?: string;
    };
    if (!data.ok) {
      if (data.description?.includes('user not found') || data.description?.includes('not found')) {
        return null;
      }
      throw new Error(`getChatMember failed: ${JSON.stringify(data)}`);
    }
    return data.result ?? null;
  }

  async isBotAdmin(chatId: number | string, botUserId: number): Promise<boolean> {
    const member = await this.getChatMember(chatId, botUserId);
    if (!member) return false;
    return ['creator', 'administrator'].includes(member.status);
  }

  async getBotId(): Promise<number> {
    const res = await fetch(`${this.baseUrl}/getMe`);
    const data = (await res.json()) as { ok: boolean; result?: { id: number } };
    if (!data.ok || !data.result) {
      throw new Error('getMe failed');
    }
    return data.result.id;
  }
}
