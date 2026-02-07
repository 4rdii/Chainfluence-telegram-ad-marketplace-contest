import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDealDto } from './dto/register-deal.dto';

@Injectable()
export class DealsService {
  constructor(private readonly prisma: PrismaService) {}

  async register(userId: number, dto: RegisterDealDto) {
    const existing = await this.prisma.deal.findUnique({
      where: { dealId: dto.dealId },
    });
    if (existing) {
      return this.toResponse(existing);
    }
    const deal = await this.prisma.deal.create({
      data: {
        dealId: dto.dealId,
        publisherId: BigInt(dto.publisherId),
        advertiserId: BigInt(dto.advertiserId),
        channelId: dto.channelId != null ? BigInt(dto.channelId) : null,
        verificationChatId: BigInt(dto.verificationChatId),
        status: 'active',
      },
    });
    return this.toResponse(deal);
  }

  async findAll(userId: number) {
    const userIdBig = BigInt(userId);
    const deals = await this.prisma.deal.findMany({
      where: {
        OR: [{ publisherId: userIdBig }, { advertiserId: userIdBig }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return deals.map(this.toResponse);
  }

  async findOne(userId: number, dealId: number) {
    const deal = await this.prisma.deal.findUnique({
      where: { dealId },
    });
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }
    const userIdBig = BigInt(userId);
    if (deal.publisherId !== userIdBig && deal.advertiserId !== userIdBig) {
      throw new ForbiddenException('You are not a party to this deal');
    }
    return this.toResponse(deal);
  }

  async updateDealStatus(
    dealId: number,
    status: 'released' | 'refunded',
    txHash?: string,
  ) {
    const data: { status: string; releasedAt?: Date; refundedAt?: Date; txHash?: string } = {
      status,
      txHash: txHash ?? undefined,
    };
    if (status === 'released') {
      data.releasedAt = new Date();
    } else {
      data.refundedAt = new Date();
    }
    return this.prisma.deal.update({
      where: { dealId },
      data,
    });
  }

  async findActiveDeals() {
    return this.prisma.deal.findMany({
      where: { status: 'active' },
    });
  }

  private toResponse(deal: {
    id: number;
    dealId: number;
    publisherId: bigint;
    advertiserId: bigint;
    channelId: bigint | null;
    verificationChatId: bigint;
    status: string;
    releasedAt: Date | null;
    refundedAt: Date | null;
    txHash: string | null;
    createdAt: Date;
    updatedAt: Date;
  }) {
    return {
      id: deal.id,
      dealId: deal.dealId,
      publisherId: deal.publisherId.toString(),
      advertiserId: deal.advertiserId.toString(),
      channelId: deal.channelId?.toString() ?? null,
      verificationChatId: deal.verificationChatId.toString(),
      status: deal.status,
      releasedAt: deal.releasedAt?.toISOString() ?? null,
      refundedAt: deal.refundedAt?.toISOString() ?? null,
      txHash: deal.txHash,
      createdAt: deal.createdAt.toISOString(),
      updatedAt: deal.updatedAt.toISOString(),
    };
  }
}
