import { Module } from '@nestjs/common';
import { DealsController } from './deals.controller';
import { DealsService } from './deals.service';
import { TelegramModule } from '../telegram/telegram.module';
import { UploadsModule } from '../uploads/uploads.module';

@Module({
  imports: [TelegramModule, UploadsModule],
  controllers: [DealsController],
  providers: [DealsService],
  exports: [DealsService],
})
export class DealsModule {}
