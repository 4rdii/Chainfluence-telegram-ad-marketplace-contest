/**
 * One-time script to create a Telegram user session string for channel verification.
 * Requires TELEGRAM_API_ID and TELEGRAM_API_HASH in env (or .env).
 * Run: npm run telegram-session
 * Copy the printed session string into .env as TELEGRAM_SESSION_STRING.
 * Never commit the session string.
 */

const readline = require('readline');
const { TelegramClient } = require('telegram');
const { StringSession } = require('telegram/sessions');

function ask(rl, question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve((answer ?? '').trim()));
  });
}

async function main() {
  const apiId = parseInt(process.env.TELEGRAM_API_ID ?? '0', 10);
  const apiHash = process.env.TELEGRAM_API_HASH ?? '';

  if (!apiId || !apiHash) {
    console.error('Set TELEGRAM_API_ID and TELEGRAM_API_HASH in .env or environment.');
    process.exit(1);
  }

  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

  const phoneNumber = await ask(rl, 'Phone number (international format, e.g. +1234567890): ');
  if (!phoneNumber) {
    console.error('Phone number is required.');
    rl.close();
    process.exit(1);
  }

  const client = new TelegramClient(new StringSession(''), apiId, apiHash, {
    connectionRetries: 5,
  });

  await client.start({
    phoneNumber: () => Promise.resolve(phoneNumber),
    phoneCode: () => ask(rl, 'Code from Telegram: '),
    password: () => ask(rl, '2FA password (or press Enter if none): '),
    onError: (err) => console.error('Auth error:', err),
  });

  const sessionString = client.session.save();
  await client.disconnect();
  rl.close();

  console.log('\n--- Copy the line below into .env as TELEGRAM_SESSION_STRING ---\n');
  console.log(sessionString);
  console.log('\n--- Never commit this value. ---');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
