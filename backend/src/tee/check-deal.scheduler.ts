import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DealsService } from '../deals/deals.service';
import { TeeClientService } from './tee-client.service';

@Injectable()
export class CheckDealScheduler {
  constructor(
    private readonly dealsService: DealsService,
    private readonly teeClient: TeeClientService,
  ) {}

  @Cron('*/10 * * * *') // every 10 minutes
  async handleCheckDeals() {
    const activeDeals = await this.dealsService.findActiveDeals();
    for (const deal of activeDeals) {
      try {
        const result = await this.teeClient.checkDeal(
          deal.dealId,
          Number(deal.verificationChatId),
        );
        if (result.action === 'released') {
          await this.dealsService.updateDealStatus(
            deal.dealId,
            'released',
            result.txHash,
          );
        } else if (result.action === 'refunded') {
          await this.dealsService.updateDealStatus(
            deal.dealId,
            'refunded',
            result.txHash,
          );
        }
      } catch (err) {
        console.error(`checkDeal failed for dealId=${deal.dealId}:`, err);
      }
    }
  }
}
