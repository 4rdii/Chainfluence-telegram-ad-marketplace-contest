const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

const envPath = path.join(__dirname, '..', '.env');
if (fs.existsSync(envPath)) {
  for (const line of fs.readFileSync(envPath, 'utf8').split('\n')) {
    const m = line.match(/^([^#=]+)=(.*)$/);
    if (m) process.env[m[1].trim()] = m[2].trim().replace(/^["']|["']$/g, '');
  }
}

const BASE = process.env.BASE_URL || 'http://127.0.0.1:3000';
const API_PREFIX = '/v1'; // must match backend setGlobalPrefix
const api = (path) => (path === '/' || path.startsWith('/api') ? path : API_PREFIX + path);
const botToken = process.env.TELEGRAM_BOT_TOKEN;
if (!botToken) {
  console.error('TELEGRAM_BOT_TOKEN required in .env');
  process.exit(1);
}

function buildInitData() {
  const user = JSON.stringify({ id: 123456789, first_name: 'Test', username: 'testuser' });
  const authDate = String(Math.floor(Date.now() / 1000));
  const params = new URLSearchParams();
  params.set('user', user);
  params.set('auth_date', authDate);
  const dataCheckString = Array.from(params.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([k, v]) => `${k}=${v}`)
    .join('\n');
  const secretKey = crypto.createHmac('sha256', 'WebAppData').update(botToken).digest();
  const hash = crypto.createHmac('sha256', secretKey).update(dataCheckString).digest('hex');
  params.set('hash', hash);
  return params.toString();
}

async function req(method, url, body = null, token = null) {
  const opts = { method, headers: { 'Content-Type': 'application/json' } };
  if (token) opts.headers['Authorization'] = `Bearer ${token}`;
  if (body) opts.body = JSON.stringify(body);
  const fullUrl = url.startsWith('http') ? url : `${BASE}${url}`;
  const res = await fetch(fullUrl, opts);
  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : null;
  } catch {
    data = text;
  }
  return { status: res.status, data };
}

function ok(r) {
  return r.status >= 200 && r.status < 300;
}

async function run() {
  const results = [];
  const log = (name, r) => {
    const pass = ok(r);
    results.push({ name, status: r.status, pass });
    console.log(`${pass ? '✓' : '✗'} ${name} ${r.status} ${typeof r.data === 'object' ? JSON.stringify(r.data).slice(0, 60) : ''}`);
  };

  const loginRes = await req('POST', api('/auth/login'), { initData: buildInitData() });
  if (loginRes.status !== 201 && loginRes.status !== 200) {
    console.error('Login failed:', loginRes);
    process.exit(1);
  }
  const token = loginRes.data.access_token;
  log('POST /v1/auth/login', loginRes);

  log('GET /', await req('GET', api('/'), null, token));
  log('GET /health', await req('GET', api('/health')));
  log('GET /health/ready', await req('GET', api('/health/ready')));

  log('GET /users/me', await req('GET', api('/users/me'), null, token));
  log('PATCH /users/me', await req('PATCH', api('/users/me'), { username: 'testuser' }, token));
  log('PATCH /users/me/wallet', await req('PATCH', api('/users/me/wallet'), { walletAddress: 'UQBxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx' }, token));

  log('GET /deals', await req('GET', api('/deals'), null, token));
  log('POST /deals/register', await req('POST', api('/deals/register'), { dealId: 1, verificationChatId: -100123, publisherId: 123456789, advertiserId: 123456789 }, token));
  log('GET /deals/1', await req('GET', api('/deals/1'), null, token));

  log('GET /channels', await req('GET', api('/channels')));
  log('GET /channels?category=Tech', await req('GET', api('/channels') + '?category=Tech'));
  log('GET /channels/mine', await req('GET', api('/channels/mine'), null, token));
  log('POST /channels', await req('POST', api('/channels'), { username: 'testchannel' }, token));
  log('GET /channels/1', await req('GET', api('/channels/1')));
  log('PATCH /channels/1', await req('PATCH', api('/channels/1'), { title: 'Test' }, token));

  log('GET /campaigns', await req('GET', api('/campaigns'), null, token));
  const campRes = await req('POST', api('/campaigns'), { title: 'E2E campaign' }, token);
  log('POST /campaigns', campRes);
  const campaignId = campRes.data?.id ?? 1;
  log('GET /campaigns/' + campaignId, await req('GET', api('/campaigns/' + campaignId), null, token));
  log('PATCH /campaigns/' + campaignId, await req('PATCH', api('/campaigns/' + campaignId), { status: 'active' }, token));
  log('GET /campaigns/' + campaignId + '/offers', await req('GET', api('/campaigns/' + campaignId + '/offers'), null, token));
  log('POST /campaigns/' + campaignId + '/offers', await req('POST', api('/campaigns/' + campaignId + '/offers'), { channelId: 1 }, token));

  log('GET /offers/mine', await req('GET', api('/offers/mine'), null, token));
  log('POST /offers/1/accept', await req('POST', api('/offers/1/accept'), null, token));
  log('POST /offers/1/reject', await req('POST', api('/offers/1/reject'), null, token));

  log('POST /escrow/create-wallet', await req('POST', api('/escrow/create-wallet'), { dealId: 1 }, token));
  log('GET /notifications', await req('GET', api('/notifications'), null, token));
  log('POST /notifications/read-all', await req('POST', api('/notifications/read-all'), null, token));

  log('POST /deals/1/reviews', await req('POST', api('/deals/1/reviews'), { rating: 5, comment: 'Great' }, token));
  log('GET /channels/1/reviews', await req('GET', api('/channels/1/reviews')));

  const failed = results.filter((r) => r.status >= 500);
  const passed = results.filter((r) => r.status >= 200 && r.status < 300).length;
  console.log('\n' + results.length + ' endpoints, ' + passed + ' 2xx, ' + failed.length + ' 5xx');
  if (failed.length) process.exit(1);
}

run().catch((e) => {
  console.error(e);
  process.exit(1);
});
