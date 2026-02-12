import { Module, forwardRef } from '@nestjs/common';
import { DealsModule } from '../deals/deals.module';
import { CheckDealScheduler } from './check-deal.scheduler';
import { TeeClientService } from './tee-client.service';

@Module({
  imports: [forwardRef(() => DealsModule)],
  providers: [TeeClientService, CheckDealScheduler],
  exports: [TeeClientService],
})
export class TeeModule {}
