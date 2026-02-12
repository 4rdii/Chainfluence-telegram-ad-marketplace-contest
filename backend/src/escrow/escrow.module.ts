import { Module, forwardRef } from '@nestjs/common';
import { EscrowController } from './escrow.controller';
import { EscrowService } from './escrow.service';
import { DealsModule } from '../deals/deals.module';
import { TeeModule } from '../tee/tee.module';

@Module({
  imports: [forwardRef(() => DealsModule), TeeModule],
  controllers: [EscrowController],
  providers: [EscrowService],
  exports: [EscrowService],
})
export class EscrowModule {}
