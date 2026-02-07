import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class OffersService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    publisherId: number,
    campaignId: number,
    channelId: number,
    amount?: string,
    format?: string,
  ) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id: campaignId },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (campaign.advertiserId === BigInt(publisherId)) {
      throw new ForbiddenException('Cannot offer on your own campaign');
    }
    const offer = await this.prisma.offer.create({
      data: {
        campaignId,
        publisherId: BigInt(publisherId),
        channelId: BigInt(channelId),
        amount: amount ?? null,
        format: format ?? null,
      },
    });
    return this.toResponse(offer);
  }

  async findByCampaign(campaignId: number) {
    const offers = await this.prisma.offer.findMany({
      where: { campaignId },
      orderBy: { createdAt: 'desc' },
    });
    return offers.map(this.toResponse);
  }

  async findMine(userId: number) {
    const offers = await this.prisma.offer.findMany({
      where: { publisherId: BigInt(userId) },
      include: { campaign: true },
      orderBy: { createdAt: 'desc' },
    });
    return offers.map((o) => ({
      ...this.toResponse(o),
      campaign: o.campaign
        ? {
            id: o.campaign.id,
            title: o.campaign.title,
            status: o.campaign.status,
          }
        : null,
    }));
  }

  async accept(advertiserId: number, offerId: number) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { campaign: true },
    });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    if (offer.campaign.advertiserId !== BigInt(advertiserId)) {
      throw new ForbiddenException('Only the campaign advertiser can accept');
    }
    if (offer.status !== 'pending') {
      throw new ForbiddenException('Offer is not pending');
    }
    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: 'accepted' },
    });
    return this.toResponse(updated);
  }

  async reject(advertiserId: number, offerId: number) {
    const offer = await this.prisma.offer.findUnique({
      where: { id: offerId },
      include: { campaign: true },
    });
    if (!offer) {
      throw new NotFoundException('Offer not found');
    }
    if (offer.campaign.advertiserId !== BigInt(advertiserId)) {
      throw new ForbiddenException('Only the campaign advertiser can reject');
    }
    if (offer.status !== 'pending') {
      throw new ForbiddenException('Offer is not pending');
    }
    const updated = await this.prisma.offer.update({
      where: { id: offerId },
      data: { status: 'rejected' },
    });
    return this.toResponse(updated);
  }

  private toResponse(offer: {
    id: number;
    campaignId: number;
    publisherId: bigint;
    channelId: bigint;
    status: string;
    amount: string | null;
    format: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: offer.id,
      campaignId: offer.campaignId,
      publisherId: offer.publisherId.toString(),
      channelId: offer.channelId.toString(),
      status: offer.status,
      amount: offer.amount,
      format: offer.format,
      createdAt: offer.createdAt.toISOString(),
      updatedAt: offer.updatedAt.toISOString(),
    };
  }
}
