#!/usr/bin/env node
const { TonClient, Address } = require('@ton/ton');
const dotenv = require('dotenv');
const { join } = require('path');

dotenv.config({ path: join(__dirname, '../../ton-escrow-tee/.env') });

const CONTRACT_ADDRESS = process.env.DEAL_REGISTRY_ADDRESS || 'EQBqQcjktBg-F8GAFBEcllmTfaxxqCK99ZTqfkOKMFNMmY_o';
const TESTNET = process.env.TESTNET === 'true';

// Create TON client
const client = new TonClient({
  endpoint: TESTNET
    ? 'https://testnet.toncenter.com/api/v2/jsonRPC'
    : 'https://toncenter.com/api/v2/jsonRPC',
  apiKey: process.env.TONCENTER_API_KEY,
});

async function getAdmin() {
  console.log('\n=== Getting Admin Address ===');
  const contractAddress = Address.parse(CONTRACT_ADDRESS);

  try {
    const result = await client.runMethod(contractAddress, 'getAdmin');
    const adminAddress = result.stack.readAddress();

    console.log('Admin Address:', adminAddress.toString());
    console.log('Admin Address (user-friendly):', adminAddress.toString({ testOnly: TESTNET }));
    return adminAddress;
  } catch (error) {
    console.error('Error getting admin:', error.message);
    return null;
  }
}

async function getNextDealId() {
  console.log('\n=== Getting Next Deal ID ===');
  const contractAddress = Address.parse(CONTRACT_ADDRESS);

  try {
    const result = await client.runMethod(contractAddress, 'getNextDealId');
    const nextDealId = result.stack.readBigNumber();

    console.log('Next Deal ID:', nextDealId.toString());
    return nextDealId;
  } catch (error) {
    console.error('Error getting next deal ID:', error.message);
    return null;
  }
}

async function getDeal(dealId) {
  console.log(`\n=== Getting Deal #${dealId} ===`);
  const contractAddress = Address.parse(CONTRACT_ADDRESS);

  try {
    const result = await client.runMethod(contractAddress, 'getDeal', [
      { type: 'int', value: BigInt(dealId) },
    ]);

    // Parse deal data
    const channelId = result.stack.readBigNumber();
    const postId = result.stack.readBigNumber();
    const contentHash = result.stack.readBigNumber();
    const duration = result.stack.readBigNumber();
    const publisher = result.stack.readAddress();
    const advertiser = result.stack.readAddress();
    const amount = result.stack.readBigNumber();
    const postedAt = result.stack.readBigNumber();
    const createdAt = result.stack.readBigNumber();

    const deal = {
      dealId,
      channelId: channelId.toString(),
      postId: postId.toString(),
      contentHash: '0x' + contentHash.toString(16).padStart(64, '0'),
      duration: duration.toString() + ' seconds (' + (Number(duration) / 3600).toFixed(1) + ' hours)',
      publisher: publisher.toString({ testOnly: TESTNET }),
      advertiser: advertiser.toString({ testOnly: TESTNET }),
      amount: amount.toString() + ' nanoTON (' + (Number(amount) / 1e9).toFixed(4) + ' TON)',
      postedAt: new Date(Number(postedAt) * 1000).toISOString(),
      createdAt: new Date(Number(createdAt) * 1000).toISOString(),
    };

    console.log(JSON.stringify(deal, null, 2));
    return deal;
  } catch (error) {
    if (error.message && error.message.includes('exit_code')) {
      console.log('Deal not found (contract returned error)');
      return null;
    }
    console.error('Error getting deal:', error.message);
    return null;
  }
}

async function checkDealExists(dealId) {
  console.log(`\n=== Checking if Deal #${dealId} Exists ===`);
  const contractAddress = Address.parse(CONTRACT_ADDRESS);

  try {
    const result = await client.runMethod(contractAddress, 'dealExists', [
      { type: 'int', value: BigInt(dealId) },
    ]);

    const exists = result.stack.readBoolean();
    console.log(`Deal #${dealId} exists:`, exists);
    return exists;
  } catch (error) {
    console.error('Error checking deal existence:', error.message);
    return false;
  }
}

async function getContractBalance() {
  console.log('\n=== Getting Contract Balance ===');
  const contractAddress = Address.parse(CONTRACT_ADDRESS);

  try {
    const balance = await client.getBalance(contractAddress);
    console.log('Balance:', balance.toString(), 'nanoTON');
    console.log('Balance:', (Number(balance) / 1e9).toFixed(4), 'TON');
    return balance;
  } catch (error) {
    console.error('Error getting balance:', error.message);
    return null;
  }
}

async function main() {
  const args = process.argv.slice(2);
  const command = args[0];

  console.log('Contract Address:', CONTRACT_ADDRESS);
  console.log('Network:', TESTNET ? 'Testnet' : 'Mainnet');

  if (!command || command === 'all') {
    await getAdmin();
    const nextId = await getNextDealId();
    await getContractBalance();

    // Try to read all registered deals
    if (nextId && Number(nextId) > 0) {
      console.log('\n=== Reading Registered Deals ===');
      for (let i = 0; i < Number(nextId); i++) {
        await getDeal(i);
      }
    }
  } else if (command === 'admin') {
    await getAdmin();
  } else if (command === 'next-id') {
    await getNextDealId();
  } else if (command === 'balance') {
    await getContractBalance();
  } else if (command === 'deal' && args[1]) {
    const dealId = parseInt(args[1]);
    await getDeal(dealId);
  } else if (command === 'exists' && args[1]) {
    const dealId = parseInt(args[1]);
    await checkDealExists(dealId);
  } else {
    console.log('\nUsage:');
    console.log('  node scripts/read-contract.js [command] [args]');
    console.log('\nCommands:');
    console.log('  all                 - Show all contract info (default)');
    console.log('  admin              - Get admin address');
    console.log('  next-id            - Get next deal ID');
    console.log('  balance            - Get contract balance');
    console.log('  deal <id>          - Get deal by ID');
    console.log('  exists <id>        - Check if deal exists');
    console.log('\nExamples:');
    console.log('  node scripts/read-contract.js');
    console.log('  node scripts/read-contract.js deal 0');
    console.log('  node scripts/read-contract.js exists 1');
  }
}

main().catch(console.error);
