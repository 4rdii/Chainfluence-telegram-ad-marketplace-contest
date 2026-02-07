import {
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { NotificationsService } from './notifications.service';

@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get()
  findAll(@CurrentUserId() userId: number) {
    return this.notificationsService.findAll(userId);
  }

  @Patch(':id/read')
  markRead(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
  ) {
    return this.notificationsService.markRead(userId, id);
  }

  @Post('read-all')
  markAllRead(@CurrentUserId() userId: number) {
    return this.notificationsService.markAllRead(userId);
  }
}
