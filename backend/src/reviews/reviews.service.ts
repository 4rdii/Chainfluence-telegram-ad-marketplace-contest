import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: number,
    dealId: number,
    dto: CreateReviewDto,
  ) {
    const deal = await this.prisma.deal.findUnique({
      where: { dealId },
    });
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }
    if (!['released', 'refunded'].includes(deal.status)) {
      throw new ForbiddenException('Can only review completed deals');
    }
    const userIdBig = BigInt(userId);
    if (deal.publisherId !== userIdBig && deal.advertiserId !== userIdBig) {
      throw new ForbiddenException('Only deal parties can submit a review');
    }
    const existing = await this.prisma.review.findFirst({
      where: { dealId: deal.id, reviewerId: userIdBig },
    });
    if (existing) {
      throw new ForbiddenException('Already reviewed this deal');
    }
    const revieweeId =
      deal.publisherId === userIdBig ? deal.advertiserId : deal.publisherId;
    const review = await this.prisma.review.create({
      data: {
        dealId: deal.id,
        reviewerId: userIdBig,
        revieweeId,
        rating: dto.rating,
        comment: dto.comment ?? null,
      },
    });
    return this.toResponse(review);
  }

  async findByChannel(channelId: string) {
    const channelIdBig = BigInt(channelId);
    const reviews = await this.prisma.review.findMany({
      where: { deal: { channelId: channelIdBig } },
      take: 50,
      orderBy: { createdAt: 'desc' },
    });
    return reviews.map(this.toResponse);
  }

  private toResponse(review: {
    id: number;
    dealId: number;
    reviewerId: bigint;
    revieweeId: bigint;
    rating: number;
    comment: string | null;
    createdAt: Date;
  }) {
    return {
      id: review.id,
      dealId: review.dealId,
      reviewerId: review.reviewerId.toString(),
      revieweeId: review.revieweeId.toString(),
      rating: review.rating,
      comment: review.comment,
      createdAt: review.createdAt.toISOString(),
    };
  }
}
