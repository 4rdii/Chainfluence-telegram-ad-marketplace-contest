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
    };
    if (!data.ok || !data.result) {
      throw new Error(`getChatAdministrators failed: ${JSON.stringify(data)}`);
    }
    return data.result;
  }

  async isBotAdmin(chatId: number | string, botUserId: number): Promise<boolean> {
    const admins = await this.getChatAdministrators(chatId);
    return admins.some(
      (m) => m.user.id === botUserId && ['creator', 'administrator'].includes(m.status),
    );
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
