import { createHmac } from 'crypto';
import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface ParsedInitData {
  user?: TelegramUser;
  auth_date: number;
  hash: string;
}

@Injectable()
export class TelegramValidationService {
  constructor(private readonly config: ConfigService) {}

  /**
   * Validates Telegram Mini App initData per https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
   * Secret key = HMAC-SHA256(bot_token, "WebAppData"), then hash = HMAC-SHA256(secret_key, data_check_string).
   */
  validateAndParse(initData: string): ParsedInitData {
    const botToken = this.config.get<string>('telegram.botToken');
    if (!botToken) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }

    const params = new URLSearchParams(initData);
    const hash = params.get('hash');
    if (!hash) {
      throw new Error('hash is missing');
    }

    params.delete('hash');
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');

    const secretKey = createHmac('sha256', 'WebAppData')
      .update(botToken)
      .digest();
    const computedHash = createHmac('sha256', secretKey)
      .update(dataCheckString)
      .digest('hex');

    if (computedHash !== hash) {
      throw new Error('Invalid initData signature');
    }

    const authDate = params.get('auth_date');
    if (!authDate) {
      throw new Error('auth_date is missing');
    }
    const authTimestamp = parseInt(authDate, 10);
    const maxAge = 24 * 60 * 60; // 24 hours
    if (Date.now() / 1000 - authTimestamp > maxAge) {
      throw new Error('initData expired');
    }

    let user: TelegramUser | undefined;
    const userJson = params.get('user');
    if (userJson) {
      try {
        user = JSON.parse(userJson) as TelegramUser;
      } catch {
        throw new Error('Invalid user in initData');
      }
    }

    return {
      user,
      auth_date: authTimestamp,
      hash,
    };
  }
}
