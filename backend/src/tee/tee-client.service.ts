import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { LoggerService } from '../logger/logger.service';

export interface CheckDealResponse {
  action: 'pending' | 'released' | 'refunded';
  reason?: string;
  txHash?: string;
}

@Injectable()
export class TeeClientService {
  constructor(
    private readonly config: ConfigService,
    private readonly logger: LoggerService,
  ) {}

  private get baseUrl(): string {
    const url = this.config.get<string>('tee.url');
    if (!url) {
      throw new Error('TEE_URL not configured');
    }
    return url.replace(/\/$/, '');
  }

  async createEscrowWallet(dealId: number): Promise<{ address: string; publicKey: string }> {
    this.logger.debug(`Creating escrow wallet for dealId=${dealId}`, 'TeeClientService');
    const res = await fetch(`${this.baseUrl}/createEscrowWallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId }),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(
        `TEE createEscrowWallet failed for dealId=${dealId}: ${res.status}`,
        text,
        'TeeClientService',
      );
      throw new Error(`TEE createEscrowWallet failed: ${res.status} ${text}`);
    }
    const result = await res.json() as { address: string; publicKey: string };
    this.logger.info(
      `Escrow wallet created for dealId=${dealId}`,
      { dealId, address: result.address },
      'TeeClientService',
    );
    return result;
  }

  async verifyAndRegisterDeal(body: unknown): Promise<{ success: boolean; error?: string; txHash?: string }> {
    this.logger.debug('Calling TEE verifyAndRegisterDeal', 'TeeClientService');
    const res = await fetch(`${this.baseUrl}/verifyAndRegisterDeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(
        `TEE verifyAndRegisterDeal failed: ${res.status}`,
        text,
        'TeeClientService',
      );
      throw new Error(`TEE verifyAndRegisterDeal failed: ${res.status} ${text}`);
    }
    const result = await res.json() as { success: boolean; error?: string; txHash?: string };
    if (result.success) {
      this.logger.info(
        'Deal verified and registered successfully',
        { txHash: result.txHash },
        'TeeClientService',
      );
    } else {
      this.logger.warn(
        `Deal verification failed: ${result.error}`,
        'TeeClientService',
      );
    }
    return result;
  }

  async checkDeal(dealId: number, verificationChatId: number): Promise<CheckDealResponse> {
    const res = await fetch(`${this.baseUrl}/checkDeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId, verificationChatId }),
    });
    if (!res.ok) {
      const text = await res.text();
      this.logger.error(
        `TEE checkDeal failed for dealId=${dealId}: ${res.status}`,
        text,
        'TeeClientService',
      );
      throw new Error(`TEE checkDeal failed: ${res.status} ${text}`);
    }
    return res.json() as Promise<CheckDealResponse>;
  }
}
