import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { ReviewsService } from './reviews.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class ReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Post(':dealId/reviews')
  create(
    @CurrentUserId() userId: number,
    @Param('dealId', ParseIntPipe) dealId: number,
    @Body() dto: CreateReviewDto,
  ) {
    return this.reviewsService.create(userId, dealId, dto);
  }
}

import { Public } from '../auth/public.decorator';

@Controller('channels')
export class ChannelReviewsController {
  constructor(private readonly reviewsService: ReviewsService) {}

  @Public()
  @Get(':channelId/reviews')
  findByChannel(@Param('channelId') channelId: string) {
    return this.reviewsService.findByChannel(channelId);
  }
}
