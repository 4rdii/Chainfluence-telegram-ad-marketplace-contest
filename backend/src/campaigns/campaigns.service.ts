import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateCampaignDto } from './dto/create-campaign.dto';
import { UpdateCampaignDto } from './dto/update-campaign.dto';

@Injectable()
export class CampaignsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, dto: CreateCampaignDto) {
    const campaign = await this.prisma.campaign.create({
      data: {
        advertiserId: BigInt(userId),
        title: dto.title,
        description: dto.description ?? null,
        category: dto.category ?? null,
        budget: dto.budget ?? null,
      },
    });
    return this.toResponse(campaign);
  }

  async findAll(category?: string, status?: string, advertiserId?: number) {
    const campaigns = await this.prisma.campaign.findMany({
      where: {
        ...(category && { category }),
        ...(status && { status }),
        ...(advertiserId !== undefined && { advertiserId: BigInt(advertiserId) }),
      },
      orderBy: { createdAt: 'desc' },
      include: { offers: true },
    });
    return campaigns.map((c) => this.toResponse(c));
  }

  async findOne(id: number) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
      include: { offers: true },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    return this.toResponse(campaign);
  }

  async update(userId: number, id: number, dto: UpdateCampaignDto) {
    const campaign = await this.prisma.campaign.findUnique({
      where: { id },
    });
    if (!campaign) {
      throw new NotFoundException('Campaign not found');
    }
    if (campaign.advertiserId !== BigInt(userId)) {
      throw new ForbiddenException('Not the campaign owner');
    }
    const updated = await this.prisma.campaign.update({
      where: { id },
      data: {
        ...(dto.title !== undefined && { title: dto.title }),
        ...(dto.description !== undefined && { description: dto.description }),
        ...(dto.category !== undefined && { category: dto.category }),
        ...(dto.status !== undefined && { status: dto.status }),
        ...(dto.budget !== undefined && { budget: dto.budget }),
      },
    });
    return this.toResponse(updated);
  }

  private toResponse(campaign: {
    id: number;
    advertiserId: bigint;
    title: string;
    description: string | null;
    category: string | null;
    status: string;
    budget: string | null;
    createdAt: Date;
    updatedAt: Date;
    offers?: { id: number }[];
  }) {
    return {
      id: campaign.id,
      advertiserId: campaign.advertiserId.toString(),
      title: campaign.title,
      description: campaign.description,
      category: campaign.category,
      status: campaign.status,
      budget: campaign.budget,
      createdAt: campaign.createdAt.toISOString(),
      updatedAt: campaign.updatedAt.toISOString(),
      ...(campaign.offers && { offerCount: campaign.offers.length }),
    };
  }
}
