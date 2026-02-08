import { Module } from '@nestjs/common';
import { TelegramApiService } from './telegram-api.service';
import { GramJsService } from './gramjs.service';
import { LoggerModule } from '../logger/logger.module';

@Module({
  imports: [LoggerModule],
  providers: [TelegramApiService, GramJsService],
  exports: [TelegramApiService, GramJsService],
})
export class TelegramModule {}
