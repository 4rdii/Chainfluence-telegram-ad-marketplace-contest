import { api, setToken, getToken } from './api';
import { getTelegramWebApp, isRunningInTelegram } from './telegram';
import { dlog } from './debug-log';

export async function authenticateWithTelegram(): Promise<string | null> {
  if (!isRunningInTelegram()) {
    dlog.warn('Auth: not running in Telegram');
    return null;
  }

  const webApp = getTelegramWebApp();
  if (!webApp?.initData) {
    dlog.warn('Auth: no initData available');
    return null;
  }

  dlog.info('Auth: initData length =', webApp.initData.length);
  // Log first 120 chars (safe — no secrets, just query_id/user/auth_date)
  dlog.info('Auth: initData preview =', webApp.initData.substring(0, 120) + '...');

  try {
    const { access_token } = await api.auth.login(webApp.initData);
    dlog.info('Auth: got token, length =', access_token.length);
    setToken(access_token);
    return access_token;
  } catch (error) {
    dlog.error('Auth: login failed:', error);
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function logout(): void {
  setToken(null);
}
