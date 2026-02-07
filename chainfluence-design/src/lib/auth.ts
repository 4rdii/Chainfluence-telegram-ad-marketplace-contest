import { api, setToken, getToken } from './api';
import { getTelegramWebApp, isRunningInTelegram } from './telegram';

export async function authenticateWithTelegram(): Promise<string | null> {
  if (!isRunningInTelegram()) return null;

  const webApp = getTelegramWebApp();
  if (!webApp?.initData) return null;

  try {
    const { access_token } = await api.auth.login(webApp.initData);
    setToken(access_token);
    return access_token;
  } catch (error) {
    console.error('Telegram auth failed:', error);
    return null;
  }
}

export function isAuthenticated(): boolean {
  return getToken() !== null;
}

export function logout(): void {
  setToken(null);
}
