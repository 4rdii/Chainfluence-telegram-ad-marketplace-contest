import { TonClient } from '@ton/ton';
// Default endpoints
const MAINNET_ENDPOINT = 'https://toncenter.com/api/v2/jsonRPC';
const TESTNET_ENDPOINT = 'https://testnet.toncenter.com/api/v2/jsonRPC';

export interface TonClientConfig {
  endpoint?: string;
  apiKey?: string;
  testnet?: boolean;
}

/**
 * Create a TonClient with configuration
 */
export function createTonClient(config: TonClientConfig = {}): TonClient {
  const endpoint = config.endpoint || (config.testnet ? TESTNET_ENDPOINT : MAINNET_ENDPOINT);

  return new TonClient({
    endpoint,
    apiKey: config.apiKey || undefined,
  });
}

/**
 * Sleep helper for waiting
 */
export function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Retry wrapper for rate-limited API calls
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  delayMs: number = 2000
): Promise<T> {
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: unknown) {
      const isRateLimit =
        error instanceof Error && (error.message.includes('429') || error.message.includes('rate'));

      if (isRateLimit && attempt < maxRetries) {
        await sleep(delayMs * attempt);
      } else {
        throw error;
      }
    }
  }
  throw new Error('Max retries exceeded');
}
