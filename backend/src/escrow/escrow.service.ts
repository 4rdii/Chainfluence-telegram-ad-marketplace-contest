import { Injectable } from '@nestjs/common';
import { DealsService } from '../deals/deals.service';
import { LoggerService } from '../logger/logger.service';
import { TeeClientService } from '../tee/tee-client.service';
import { VerifyAndRegisterDealDto } from './dto/verify-and-register-deal.dto';

@Injectable()
export class EscrowService {
  constructor(
    private readonly teeClient: TeeClientService,
    private readonly dealsService: DealsService,
    private readonly logger: LoggerService,
  ) {}

  async createWallet(dealId: number) {
    this.logger.debug(`Creating wallet for dealId=${dealId}`, 'EscrowService');
    return this.teeClient.createEscrowWallet(dealId);
  }

  async verifyAndRegisterDeal(
    userId: number,
    dto: VerifyAndRegisterDealDto,
  ) {
    this.logger.info(
      `Verifying and registering deal ${dto.params.dealId}`,
      {
        dealId: dto.params.dealId,
        publisherId: dto.publisherId,
        advertiserId: dto.advertiserId,
      },
      'EscrowService',
    );

    const result = await this.teeClient.verifyAndRegisterDeal(dto);
    if (result.success && result.txHash !== undefined) {
      await this.dealsService.register(userId, {
        dealId: dto.params.dealId,
        verificationChatId: dto.verificationChatId,
        publisherId: dto.publisherId,
        advertiserId: dto.advertiserId,
        channelId: dto.channelId,
      });
      this.logger.info(
        `Deal ${dto.params.dealId} registered in database`,
        { dealId: dto.params.dealId, txHash: result.txHash },
        'EscrowService',
      );
    } else {
      this.logger.warn(
        `Deal ${dto.params.dealId} verification failed`,
        'EscrowService',
      );
    }
    return result;
  }
}
