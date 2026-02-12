import { Module, forwardRef } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { TelegramModule } from '../telegram/telegram.module';
import { UploadsModule } from '../uploads/uploads.module';
import { EscrowModule } from '../escrow/escrow.module';

@Module({
  imports: [
    TelegramModule,
    UploadsModule,
    forwardRef(() => EscrowModule),
  ],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
