import { Injectable } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { DealsService } from '../deals/deals.service';
import { LoggerService } from '../logger/logger.service';
import { TeeClientService } from './tee-client.service';

@Injectable()
export class CheckDealScheduler {
  constructor(
    private readonly dealsService: DealsService,
    private readonly teeClient: TeeClientService,
    private readonly logger: LoggerService,
  ) {}

  @Cron('*/10 * * * *') // every 10 minutes
  async handleCheckDeals() {
    const activeDeals = await this.dealsService.findActiveDeals();
    this.logger.log(
      `Starting scheduled deal checks for ${activeDeals.length} active deals`,
      'CheckDealScheduler',
    );

    for (const deal of activeDeals) {
      try {
        const result = await this.teeClient.checkDeal({
          dealId: deal.dealId,
          verificationChatId: Number(deal.verificationChatId),
        });

        if (result.action === 'released') {
          await this.dealsService.updateDealStatus(
            deal.dealId,
            'released',
            result.txHash,
          );
          this.logger.info(
            `Deal ${deal.dealId} released to publisher`,
            { dealId: deal.dealId, txHash: result.txHash },
            'CheckDealScheduler',
          );
        } else if (result.action === 'refunded') {
          await this.dealsService.updateDealStatus(
            deal.dealId,
            'refunded',
            result.txHash,
          );
          this.logger.info(
            `Deal ${deal.dealId} refunded to advertiser`,
            { dealId: deal.dealId, txHash: result.txHash },
            'CheckDealScheduler',
          );
        } else {
          this.logger.debug(
            `Deal ${deal.dealId} still pending`,
            'CheckDealScheduler',
          );
        }
      } catch (err) {
        this.logger.error(
          `checkDeal failed for dealId=${deal.dealId}`,
          err instanceof Error ? err.stack : String(err),
          'CheckDealScheduler',
        );
      }
    }
  }
}
