import { Injectable } from '@nestjs/common';
import { DealsService } from '../deals/deals.service';
import { TeeClientService } from '../tee/tee-client.service';

@Injectable()
export class EscrowService {
  constructor(
    private readonly teeClient: TeeClientService,
    private readonly dealsService: DealsService,
  ) {}

  async createWallet(dealId: number) {
    return this.teeClient.createEscrowWallet(dealId);
  }

  async verifyAndRegisterDeal(
    userId: number,
    body: {
      params: { dealId: number };
      verificationChatId: number;
      [key: string]: unknown;
    },
  ) {
    const result = await this.teeClient.verifyAndRegisterDeal(body);
    if (result.success && result.txHash !== undefined) {
      await this.dealsService.register(userId, {
        dealId: body.params.dealId,
        verificationChatId: body.verificationChatId,
      });
    }
    return result;
  }
}
