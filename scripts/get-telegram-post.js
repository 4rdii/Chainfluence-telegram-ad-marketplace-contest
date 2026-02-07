#!/usr/bin/env node
const crypto = require('crypto');

const BOT_TOKEN = process.env.BOT_TOKEN || '';
const TELEGRAM_API = `https://api.telegram.org/bot${BOT_TOKEN}`;

function computeContentHash(content) {
  const hash = crypto.createHash('sha256').update(content).digest('hex');
  return '0x' + hash;
}

async function getChannelInfo(channelUsername) {
  try {
    const response = await fetch(`${TELEGRAM_API}/getChat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ chat_id: `@${channelUsername}` }),
    });
    const data = await response.json();
    if (!data.ok) {
      console.error('Failed to get channel info:', data.description);
      return null;
    }
    return data.result;
  } catch (error) {
    console.error('Error fetching channel info:', error.message);
    return null;
  }
}

async function getMessage(channelUsername, messageId) {
  try {
    // First try to get the message using forwardMessage to a private chat
    // We'll use getChat to verify channel exists
    const chatInfo = await getChannelInfo(channelUsername);
    if (!chatInfo) {
      return null;
    }

    console.log('\n=== Channel Info ===');
    console.log(`Title: ${chatInfo.title}`);
    console.log(`Username: @${chatInfo.username}`);
    console.log(`Channel ID: ${chatInfo.id}`);
    console.log(`Type: ${chatInfo.type}`);

    // Try to get updates to see recent messages
    console.log('\n=== Fetching Message ===');
    console.log(`Attempting to fetch message ${messageId} from @${channelUsername}...`);

    // We can't directly get a message, but we can try to forward it
    // For now, let's return the channel info and user can manually provide content
    console.log('\nNote: Bot needs to be admin in the channel or have access to read messages.');
    console.log('Please manually copy the message content from: https://t.me/' + channelUsername + '/' + messageId);

    return {
      channelId: chatInfo.id,
      messageId: parseInt(messageId),
      channelUsername: chatInfo.username,
    };
  } catch (error) {
    console.error('Error fetching message:', error.message);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);

  if (args.length !== 1) {
    console.log('Usage: node get-telegram-post.js <t.me URL or channel/messageId>');
    console.log('Example: node get-telegram-post.js https://t.me/test_functions/7');
    console.log('Example: node get-telegram-post.js test_functions/7');
    process.exit(1);
  }

  const input = args[0];
  let channelUsername, messageId;

  // Parse input
  if (input.includes('t.me/')) {
    const match = input.match(/t\.me\/([^/]+)\/(\d+)/);
    if (!match) {
      console.error('Invalid Telegram URL format');
      process.exit(1);
    }
    channelUsername = match[1];
    messageId = match[2];
  } else {
    const parts = input.split('/');
    if (parts.length !== 2) {
      console.error('Invalid format. Use: channel/messageId');
      process.exit(1);
    }
    channelUsername = parts[0];
    messageId = parts[1];
  }

  console.log(`\nFetching data for: @${channelUsername} / message ${messageId}`);

  const result = await getMessage(channelUsername, messageId);

  if (result) {
    console.log('\n=== Data for Test ===');
    console.log(`channelId: ${result.channelId}`);
    console.log(`postId: ${result.messageId}`);
    console.log(`verificationChatId: ${result.channelId} (use same as channel)`);
    console.log('\nTo calculate content hash, paste the message content when prompted:');

    // Read from stdin
    if (process.stdin.isTTY) {
      const readline = require('readline').createInterface({
        input: process.stdin,
        output: process.stdout
      });

      readline.question('\nPaste message content (or press Enter to skip): ', (content) => {
        if (content) {
          const hash = computeContentHash(content);
          console.log(`\nContent Hash: ${hash}`);
          console.log(`BigInt format: BigInt('${hash}')`);
        }
        readline.close();
      });
    }
  }
}

main().catch(console.error);
