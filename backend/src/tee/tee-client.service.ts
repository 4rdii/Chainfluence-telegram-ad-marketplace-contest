import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface CheckDealResponse {
  action: 'pending' | 'released' | 'refunded';
  reason?: string;
  txHash?: string;
}

@Injectable()
export class TeeClientService {
  constructor(private readonly config: ConfigService) {}

  private get baseUrl(): string {
    const url = this.config.get<string>('tee.url');
    if (!url) {
      throw new Error('TEE_URL not configured');
    }
    return url.replace(/\/$/, '');
  }

  async createEscrowWallet(dealId: number): Promise<{ address: string; publicKey: string }> {
    const res = await fetch(`${this.baseUrl}/createEscrowWallet`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TEE createEscrowWallet failed: ${res.status} ${text}`);
    }
    return res.json() as Promise<{ address: string; publicKey: string }>;
  }

  async verifyAndRegisterDeal(body: unknown): Promise<{ success: boolean; error?: string; txHash?: string }> {
    const res = await fetch(`${this.baseUrl}/verifyAndRegisterDeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TEE verifyAndRegisterDeal failed: ${res.status} ${text}`);
    }
    return res.json() as Promise<{ success: boolean; error?: string; txHash?: string }>;
  }

  async checkDeal(dealId: number, verificationChatId: number): Promise<CheckDealResponse> {
    const res = await fetch(`${this.baseUrl}/checkDeal`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ dealId, verificationChatId }),
    });
    if (!res.ok) {
      const text = await res.text();
      throw new Error(`TEE checkDeal failed: ${res.status} ${text}`);
    }
    return res.json() as Promise<CheckDealResponse>;
  }
}
