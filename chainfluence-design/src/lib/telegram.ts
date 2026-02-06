// Telegram WebApp types
export interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
}

export interface TelegramWebApp {
  initData: string;
  initDataUnsafe: {
    query_id?: string;
    user?: TelegramUser;
    auth_date?: number;
    hash?: string;
  };
  version: string;
  platform: string;
  colorScheme: 'light' | 'dark';
  themeParams: {
    bg_color?: string;
    text_color?: string;
    hint_color?: string;
    link_color?: string;
    button_color?: string;
    button_text_color?: string;
    secondary_bg_color?: string;
  };
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  headerColor: string;
  backgroundColor: string;
  isClosingConfirmationEnabled: boolean;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  MainButton: {
    text: string;
    color: string;
    textColor: string;
    isVisible: boolean;
    isActive: boolean;
    isProgressVisible: boolean;
    setText: (text: string) => void;
    show: () => void;
    hide: () => void;
    enable: () => void;
    disable: () => void;
    showProgress: (leaveActive?: boolean) => void;
    hideProgress: () => void;
    onClick: (callback: () => void) => void;
    offClick: (callback: () => void) => void;
  };
  HapticFeedback: {
    impactOccurred: (style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft') => void;
    notificationOccurred: (type: 'error' | 'success' | 'warning') => void;
    selectionChanged: () => void;
  };
  close: () => void;
  expand: () => void;
  ready: () => void;
  sendData: (data: string) => void;
  openLink: (url: string, options?: { try_instant_view?: boolean }) => void;
  openTelegramLink: (url: string) => void;
  showPopup: (params: {
    title?: string;
    message: string;
    buttons?: Array<{
      id?: string;
      type?: 'default' | 'ok' | 'close' | 'cancel' | 'destructive';
      text?: string;
    }>;
  }, callback?: (buttonId: string) => void) => void;
  showAlert: (message: string, callback?: () => void) => void;
  showConfirm: (message: string, callback?: (confirmed: boolean) => void) => void;
  enableClosingConfirmation: () => void;
  disableClosingConfirmation: () => void;
  setHeaderColor: (color: 'bg_color' | 'secondary_bg_color' | string) => void;
  setBackgroundColor: (color: 'bg_color' | 'secondary_bg_color' | string) => void;
}

declare global {
  interface Window {
    Telegram?: {
      WebApp: TelegramWebApp;
    };
  }
}

// Get Telegram WebApp instance
export function getTelegramWebApp(): TelegramWebApp | null {
  if (typeof window !== 'undefined' && window.Telegram?.WebApp) {
    return window.Telegram.WebApp;
  }
  return null;
}

// Get Telegram user data
export function getTelegramUser(): TelegramUser | null {
  const webApp = getTelegramWebApp();
  return webApp?.initDataUnsafe?.user || null;
}

// Check if running inside Telegram
export function isRunningInTelegram(): boolean {
  const webApp = getTelegramWebApp();
  return !!webApp?.initData;
}

// Initialize Telegram WebApp
export function initTelegramWebApp(): void {
  const webApp = getTelegramWebApp();
  if (webApp) {
    // Tell Telegram the app is ready
    webApp.ready();
    // Expand to full height
    webApp.expand();
    // Set dark theme colors
    webApp.setHeaderColor('#1a1a2e');
    webApp.setBackgroundColor('#1a1a2e');
  }
}

// Back Button helpers
export function showBackButton(callback: () => void): void {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.BackButton.onClick(callback);
    webApp.BackButton.show();
  }
}

export function hideBackButton(): void {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.BackButton.hide();
  }
}

// Haptic feedback helpers
export function hapticImpact(style: 'light' | 'medium' | 'heavy' | 'rigid' | 'soft' = 'light'): void {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.HapticFeedback.impactOccurred(style);
  }
}

export function hapticNotification(type: 'error' | 'success' | 'warning'): void {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.HapticFeedback.notificationOccurred(type);
  }
}

export function hapticSelection(): void {
  const webApp = getTelegramWebApp();
  if (webApp) {
    webApp.HapticFeedback.selectionChanged();
  }
}
