export default () => ({
  port: parseInt(process.env.PORT ?? '3000', 10),
  nodeEnv: process.env.NODE_ENV ?? 'development',
  database: {
    url: process.env.DATABASE_URL,
  },
  telegram: {
    botToken: process.env.TELEGRAM_BOT_TOKEN,
    apiId: parseInt(process.env.TELEGRAM_API_ID ?? '0', 10),
    apiHash: process.env.TELEGRAM_API_HASH ?? '',
  },
  tee: {
    url: process.env.TEE_URL,
  },
  jwt: {
    secret: process.env.JWT_SECRET,
  },
});
