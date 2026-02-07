import { createHmac } from 'crypto';
import { ConfigService } from '@nestjs/config';
import { TelegramValidationService } from './telegram-validation.service';

describe('TelegramValidationService', () => {
  let service: TelegramValidationService;
  const botToken = 'test-bot-token';

  beforeEach(() => {
    const config = {
      get: jest.fn((key: string) => (key === 'telegram.botToken' ? botToken : null)),
    } as unknown as ConfigService;
    service = new TelegramValidationService(config);
  });

  function buildValidInitData(overrides: Record<string, string> = {}) {
    const params: Record<string, string> = {
      auth_date: String(Math.floor(Date.now() / 1000)),
      user: JSON.stringify({ id: 123, first_name: 'Test' }),
      ...overrides,
    };
    const dataCheckString = Object.keys(params)
      .sort()
      .map((k) => `${k}=${params[k]}`)
      .join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    return Object.entries(params)
      .concat([['hash', hash]])
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('&');
  }

  it('throws when bot token is not configured', () => {
    const config = { get: jest.fn(() => null) } as unknown as ConfigService;
    const svc = new TelegramValidationService(config);
    expect(() => svc.validateAndParse('auth_date=1&hash=ab')).toThrow(
      'TELEGRAM_BOT_TOKEN not configured',
    );
  });

  it('throws when hash is missing', () => {
    expect(() => service.validateAndParse('auth_date=123')).toThrow('hash is missing');
  });

  it('throws when signature is invalid', () => {
    const initData = 'auth_date=123&hash=invalid';
    expect(() => service.validateAndParse(initData)).toThrow('Invalid initData signature');
  });

  it('throws when auth_date is missing', () => {
    // Build initData with valid signature but no auth_date (only user in payload)
    const params = new URLSearchParams();
    params.set('user', JSON.stringify({ id: 1 }));
    const dataCheckString = Array.from(params.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([k, v]) => `${k}=${v}`)
      .join('\n');
    const secretKey = createHmac('sha256', 'WebAppData').update(botToken).digest();
    const hash = createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
    params.set('hash', hash);
    const initData = params.toString();
    expect(() => service.validateAndParse(initData)).toThrow('auth_date is missing');
  });

  it('throws when initData is expired', () => {
    const oldDate = Math.floor(Date.now() / 1000) - 25 * 60 * 60;
    const initData = buildValidInitData({ auth_date: String(oldDate) });
    expect(() => service.validateAndParse(initData)).toThrow('initData expired');
  });

  it('returns parsed user and auth_date when valid', () => {
    const initData = buildValidInitData();
    const result = service.validateAndParse(initData);
    expect(result.user).toEqual({ id: 123, first_name: 'Test' });
    expect(result.auth_date).toBeGreaterThan(0);
    expect(result.hash).toBeDefined();
  });
});
