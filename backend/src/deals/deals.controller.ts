import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { DealsService } from './deals.service';
import { EscrowService } from '../escrow/escrow.service';
import { RegisterDealDto } from './dto/register-deal.dto';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(
    private readonly dealsService: DealsService,
    private readonly escrowService: EscrowService,
  ) {}

  @Post('register')
  register(@CurrentUserId() userId: number, @Body() dto: RegisterDealDto) {
    return this.dealsService.register(userId, dto);
  }

  @Post(':dealId/reject')
  reject(
    @CurrentUserId() userId: number,
    @Param('dealId', ParseIntPipe) dealId: number,
  ) {
    return this.dealsService.rejectDeal(dealId, userId);
  }

  @Post(':dealId/post')
  async postCreative(
    @CurrentUserId() userId: number,
    @Param('dealId', ParseIntPipe) dealId: number,
  ) {
    const result = await this.dealsService.postCreative(dealId, userId);
    // Post succeeded → postId/postedAt now set → trigger TEE if all conditions met
    await this.escrowService.tryTriggerTee(dealId);
    return result;
  }

  @Get()
  findAll(@CurrentUserId() userId: number) {
    return this.dealsService.findAll(userId);
  }

  @Get(':dealId')
  findOne(
    @CurrentUserId() userId: number,
    @Param('dealId', ParseIntPipe) dealId: number,
  ) {
    return this.dealsService.findOne(userId, dealId);
  }
}
