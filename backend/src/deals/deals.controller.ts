import { Body, Controller, Get, Param, ParseIntPipe, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { DealsService } from './deals.service';
import { RegisterDealDto } from './dto/register-deal.dto';

@Controller('deals')
@UseGuards(JwtAuthGuard)
export class DealsController {
  constructor(private readonly dealsService: DealsService) {}

  @Post('register')
  register(@CurrentUserId() userId: number, @Body() dto: RegisterDealDto) {
    return this.dealsService.register(userId, dto);
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
