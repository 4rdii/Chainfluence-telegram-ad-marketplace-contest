import { validateEnv } from './env.validation';

describe('validateEnv', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    jest.resetModules();
    process.env = { ...originalEnv };
  });

  afterAll(() => {
    process.env = originalEnv;
  });

  it('throws when DATABASE_URL is missing', () => {
    process.env.DATABASE_URL = '';
    process.env.TELEGRAM_BOT_TOKEN = 'token';
    process.env.TEE_URL = 'http://tee';
    process.env.JWT_SECRET = 'secret';
    expect(validateEnv).toThrow(/Missing required environment variables.*DATABASE_URL/);
  });

  it('throws when multiple vars are missing', () => {
    process.env.DATABASE_URL = '';
    process.env.TELEGRAM_BOT_TOKEN = '';
    expect(validateEnv).toThrow(/DATABASE_URL|TELEGRAM_BOT_TOKEN/);
  });

  it('does not throw when all required vars are set', () => {
    process.env.DATABASE_URL = 'postgresql://localhost/db';
    process.env.TELEGRAM_BOT_TOKEN = 'token';
    process.env.TEE_URL = 'http://localhost:8000';
    process.env.JWT_SECRET = 'jwt-secret';
    expect(() => validateEnv()).not.toThrow();
  });
});
