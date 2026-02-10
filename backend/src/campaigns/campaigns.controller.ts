import {
  Body,
  Controller,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { CampaignsService } from './campaigns.service';
import { OffersService } from '../offers/offers.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';
import { CreateOfferDto } from '../offers/dto/create-offer.dto';

@Controller('campaigns')
@UseGuards(JwtAuthGuard)
export class CampaignsController {
  constructor(
    private readonly campaignsService: CampaignsService,
    private readonly offersService: OffersService,
  ) {}

  @Post()
  create(@CurrentUserId() userId: number, @Body() dto: CreateCampaignDto) {
    return this.campaignsService.create(userId, dto);
  }

  @Get()
  @Public()
  findAll(
    @Query('category') category?: string,
    @Query('status') status?: string,
    @Query('advertiserId') advertiserId?: string,
  ) {
    const advId = advertiserId ? parseInt(advertiserId, 10) : undefined;
    return this.campaignsService.findAll(category, status, advId);
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.campaignsService.findOne(id);
  }

  @Patch(':id')
  update(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) id: number,
    @Body() dto: UpdateCampaignDto,
  ) {
    return this.campaignsService.update(userId, id, dto);
  }

  @Get(':id/offers')
  getOffers(@Param('id', ParseIntPipe) id: number) {
    return this.offersService.findByCampaign(id);
  }

  @Post(':id/offers')
  createOffer(
    @CurrentUserId() userId: number,
    @Param('id', ParseIntPipe) campaignId: number,
    @Body() dto: CreateOfferDto,
  ) {
    return this.offersService.create(
      userId,
      campaignId,
      dto.channelId,
      dto.amount,
      dto.format,
    );
  }
}
