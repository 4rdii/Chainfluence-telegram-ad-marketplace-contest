export function validateEnv(): void {
  const required = [
    'DATABASE_URL',
    'TELEGRAM_BOT_TOKEN',
    'TEE_URL',
    'JWT_SECRET',
  ] as const;
  const missing = required.filter((key) => !process.env[key]);
  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`,
    );
  }
}
