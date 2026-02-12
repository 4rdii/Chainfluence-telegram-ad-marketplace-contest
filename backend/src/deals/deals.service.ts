import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { GramJsService } from '../telegram/gramjs.service';
import { UploadsService } from '../uploads/uploads.service';
import { RegisterDealDto } from './dto/register-deal.dto';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly gramJs: GramJsService,
    private readonly uploads: UploadsService,
  ) {}

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
        escrowAddress: dto.escrowAddress ?? null,
        amount: dto.amount ?? null,
        duration: dto.duration ?? null,
        contentHash: dto.contentHash ?? null,
        publisherWallet: dto.publisherWallet ?? null,
        advertiserWallet: dto.advertiserWallet ?? null,
        creativeText: dto.creativeText ?? null,
        creativeImages: dto.creativeImages ?? [],
        status: 'active',
      },
    });
    return this.toResponse(deal);
  }

  /**
   * Store a party's TonConnect signData signature and metadata.
   * Called once per party after they sign via their TON wallet.
   */
  async signDeal(
    userId: number,
    dealId: number,
    role: 'publisher' | 'advertiser',
    signatureData: {
      signature: string;
      publicKey: string;
      walletAddress: string;
      timestamp: number;
      domain: string;
    },
  ) {
    const deal = await this.prisma.deal.findUnique({ where: { dealId } });
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    // Ensure the caller is the correct party
    const userIdBig = BigInt(userId);
    if (role === 'publisher' && deal.publisherId !== userIdBig) {
      throw new ForbiddenException('You are not the publisher of this deal');
    }
    if (role === 'advertiser' && deal.advertiserId !== userIdBig) {
      throw new ForbiddenException('You are not the advertiser of this deal');
    }

    const data =
      role === 'publisher'
        ? {
            publisherSignature: signatureData.signature,
            publisherPublicKey: signatureData.publicKey,
            publisherWallet: deal.publisherWallet ?? signatureData.walletAddress,
            publisherSignTimestamp: signatureData.timestamp,
            publisherSignDomain: signatureData.domain,
          }
        : {
            advertiserSignature: signatureData.signature,
            advertiserPublicKey: signatureData.publicKey,
            advertiserWallet: signatureData.walletAddress,
            advertiserSignTimestamp: signatureData.timestamp,
            advertiserSignDomain: signatureData.domain,
          };

    let updated = await this.prisma.deal.update({
      where: { dealId },
      data,
    });

    if (updated.publisherSignature && updated.advertiserSignature && updated.status === 'active') {
      updated = await this.prisma.deal.update({
        where: { dealId },
        data: { status: 'approved' },
      });
    }

    return this.toResponse(updated);
  }

  async rejectDeal(dealId: number, userId: number) {
    const userIdBig = BigInt(userId);
    const deal = await this.prisma.deal.findFirst({
      where: { dealId, publisherId: userIdBig },
    });
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }
    if (deal.status !== 'active') {
      throw new BadRequestException('Can only reject deals in active status');
    }
    const updated = await this.prisma.deal.update({
      where: { id: deal.id },
      data: { status: 'rejected', refundedAt: new Date() },
    });
    return this.toResponse(updated);
  }

  /**
   * Store post information when publisher confirms posting.
   */
  async updatePostInfo(dealId: number, postMessageId: number) {
    const now = Math.floor(Date.now() / 1000);
    const updated = await this.prisma.deal.update({
      where: { dealId },
      data: {
        postId: postMessageId,
        postedAt: now,
      },
    });
    return this.toResponse(updated);
  }

  /**
   * Return the raw deal record (for internal use by EscrowService).
   */
  async findRaw(dealId: number) {
    const deal = await this.prisma.deal.findUnique({ where: { dealId } });
    if (!deal) {
      throw new NotFoundException('Deal not found');
    }
    return deal;
  }

  async findAll(userId: number) {
    const userIdBig = BigInt(userId);
    const deals = await this.prisma.deal.findMany({
      where: {
        OR: [{ publisherId: userIdBig }, { advertiserId: userIdBig }],
      },
      orderBy: { createdAt: 'desc' },
    });
    return deals.map((d) => this.toResponse(d));
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

  /**
   * Post the deal's creative content to the channel using GramJS.
   * Only the publisher (channel owner) can call this.
   */
  async postCreative(dealId: number, userId: number) {
    const userIdBig = BigInt(userId);
    
    // Fetch deal
    const deal = await this.prisma.deal.findUnique({
      where: { dealId },
    });

    if (!deal) {
      throw new NotFoundException('Deal not found');
    }

    // Verify caller is the publisher
    if (deal.publisherId !== userIdBig) {
      throw new ForbiddenException('Only the publisher can post the creative');
    }

    // Check if channel exists
    if (!deal.channelId) {
      throw new BadRequestException('Deal has no associated channel');
    }

    const channel = await this.prisma.channel.findUnique({
      where: { id: deal.channelId },
    });

    if (!channel || !channel.username) {
      throw new BadRequestException('Channel not found or has no username');
    }

    // Verify GramJS is ready
    if (!this.gramJs.isReady()) {
      throw new BadRequestException('Telegram client not ready. Check TELEGRAM_API_ID/TELEGRAM_API_HASH configuration.');
    }

    // Get creative content
    const text = deal.creativeText ?? '';
    const fileIds = Array.isArray(deal.creativeImages) ? deal.creativeImages as string[] : [];

    // Download image buffers from file_ids
    const photoBuffers: Buffer[] = [];
    for (const fileId of fileIds) {
      try {
        const { buffer } = await this.uploads.proxyFile(fileId);
        photoBuffers.push(buffer);
      } catch (err) {
        throw new BadRequestException(
          `Failed to fetch image ${fileId}: ${err instanceof Error ? err.message : String(err)}`,
        );
      }
    }

    // Post to channel
    try {
      const { messageId } = await this.gramJs.postToChannel(
        channel.username,
        text,
        photoBuffers.length > 0 ? photoBuffers : undefined,
      );

      // Update deal with post info
      const now = Math.floor(Date.now() / 1000);
      const updated = await this.prisma.deal.update({
        where: { dealId },
        data: {
          postId: messageId,
          postedAt: now,
        },
      });

      return {
        success: true,
        messageId,
        channelUsername: channel.username,
        deal: this.toResponse(updated),
      };
    } catch (err) {
      throw new BadRequestException(
        `Failed to post to channel: ${err instanceof Error ? err.message : String(err)}`,
      );
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private toResponse(deal: any) {
    return {
      id: deal.id,
      dealId: deal.dealId,
      publisherId: deal.publisherId.toString(),
      advertiserId: deal.advertiserId.toString(),
      channelId: deal.channelId?.toString() ?? null,
      verificationChatId: deal.verificationChatId.toString(),
      status: deal.status,
      escrowAddress: deal.escrowAddress ?? null,
      amount: deal.amount ?? null,
      duration: deal.duration ?? null,
      contentHash: deal.contentHash ?? null,
      postId: deal.postId ?? null,
      postedAt: deal.postedAt ?? null,
      publisherWallet: deal.publisherWallet ?? null,
      advertiserWallet: deal.advertiserWallet ?? null,
      publisherSigned: !!deal.publisherSignature,
      advertiserSigned: !!deal.advertiserSignature,
      releasedAt: deal.releasedAt?.toISOString() ?? null,
      refundedAt: deal.refundedAt?.toISOString() ?? null,
      txHash: deal.txHash,
      creativeText: deal.creativeText ?? null,
      creativeImages: Array.isArray(deal.creativeImages) ? deal.creativeImages : [],
      createdAt: deal.createdAt.toISOString(),
      updatedAt: deal.updatedAt.toISOString(),
    };
  }
}
