import { BadRequestException, Injectable } from '@nestjs/common';
import { DealsService } from '../deals/deals.service';
import { LoggerService } from '../logger/logger.service';
import { TeeClientService } from '../tee/tee-client.service';
import { VerifyAndRegisterDealDto } from './dto/verify-and-register-deal.dto';
import { SignDealDto } from './dto/sign-deal.dto';
import { ConfirmPostedDto } from './dto/confirm-posted.dto';

@Injectable()
export class EscrowService {
  constructor(
    private readonly teeClient: TeeClientService,
    private readonly dealsService: DealsService,
    private readonly logger: LoggerService,
  ) {}

  async createWallet(dealId: number) {
    this.logger.debug(`Creating wallet for dealId=${dealId}`, 'EscrowService');
    return this.teeClient.createEscrowWallet(dealId);
  }

  // ── Submit TonConnect signData signature ──

  /**
   * Stores a party's TonConnect signature.
   * If both parties have signed and the post is confirmed (postId set),
   * automatically triggers TEE verification.
   *
   * Returns: { deal, teeResult? }
   */
  async signDeal(userId: number, dto: SignDealDto) {
    this.logger.info(
      `Party submitting TonConnect signature for deal ${dto.dealId} as ${dto.role}`,
      { dealId: dto.dealId, role: dto.role },
      'EscrowService',
    );

    await this.dealsService.signDeal(userId, dto.dealId, dto.role, {
      signature: dto.signature,
      publicKey: dto.publicKey,
      walletAddress: dto.walletAddress,
      timestamp: dto.timestamp,
      domain: dto.domain,
    });

    // Check if we can auto-trigger TEE verification
    return this.tryTriggerTee(dto.dealId);
  }

  // ── Confirm posted (sets postId/postedAt, may trigger TEE) ──

  /**
   * Publisher confirms ad posting. Sets postId and postedAt.
   * If both parties have already signed, auto-triggers TEE verification.
   *
   * Returns: { deal, teeResult? }
   */
  async confirmPosted(userId: number, dto: ConfirmPostedDto) {
    // 1. Parse post message ID from the link
    const postIdMatch = dto.postLink.match(/\/(\d+)\s*$/);
    const postMessageId = postIdMatch
      ? parseInt(postIdMatch[1], 10)
      : parseInt(dto.postLink, 10);

    if (!postMessageId || isNaN(postMessageId)) {
      throw new BadRequestException(
        'Could not parse message ID. Use format: https://t.me/channel/123 or just the ID.',
      );
    }

    // 2. Store the post info (sets postId and postedAt)
    await this.dealsService.updatePostInfo(dto.dealId, postMessageId);

    this.logger.info(
      `Post info set for deal ${dto.dealId}: postId=${postMessageId}`,
      { dealId: dto.dealId, postId: postMessageId },
      'EscrowService',
    );

    // 3. Check if we can auto-trigger TEE verification
    return this.tryTriggerTee(dto.dealId);
  }

  /**
   * Check if a deal is ready for TEE verification and trigger it.
   * Requirements: both signatures present + postId set.
   *
   * Returns: { deal, teeResult? }
   */
  async tryTriggerTee(dealId: number) {
    const deal = await this.dealsService.findRaw(dealId);
    const dealResponse = await this.dealsService.findOne(
      Number(deal.publisherId),
      dealId,
    );

    // Check if all requirements are met
    const hasBothSigs =
      deal.publisherSignature &&
      deal.publisherPublicKey &&
      deal.advertiserSignature &&
      deal.advertiserPublicKey;
    const hasPostInfo = deal.postId != null && deal.postedAt != null;
    const hasRequiredFields =
      deal.amount &&
      deal.contentHash &&
      deal.channelId != null &&
      deal.publisherWallet &&
      deal.advertiserWallet;

    if (!hasBothSigs || !hasPostInfo || !hasRequiredFields) {
      // Not ready yet — return the deal without TEE result
      return { deal: dealResponse };
    }

    this.logger.info(
      `All requirements met for deal ${dealId}, triggering TEE verification`,
      { dealId },
      'EscrowService',
    );

    // Build TEE payload
    const teePayload = {
      params: {
        dealId: deal.dealId,
        channelId: Number(deal.channelId),
        postId: deal.postId!,
        contentHash: deal.contentHash!,
        duration: deal.duration ?? 86400,
        publisher: deal.publisherWallet!,
        advertiser: deal.advertiserWallet!,
        amount: deal.amount!,
        postedAt: deal.postedAt!,
      },
      publisher: {
        signature: deal.publisherSignature!,
        publicKey: deal.publisherPublicKey!,
        timestamp: deal.publisherSignTimestamp!,
        domain: deal.publisherSignDomain!,
      },
      advertiser: {
        signature: deal.advertiserSignature!,
        publicKey: deal.advertiserPublicKey!,
        timestamp: deal.advertiserSignTimestamp!,
        domain: deal.advertiserSignDomain!,
      },
      verificationChatId: Number(deal.verificationChatId),
    };

    // Call TEE
    const teeResult = await this.teeClient.verifyAndRegisterDeal(teePayload);

    if (teeResult.success && teeResult.txHash !== undefined) {
      this.logger.info(
        `Deal ${dealId} verified and registered on-chain`,
        { dealId, txHash: teeResult.txHash },
        'EscrowService',
      );
    } else {
      this.logger.warn(
        `Deal ${dealId} TEE verification failed: ${teeResult.error}`,
        'EscrowService',
      );
    }

    return { deal: dealResponse, teeResult };
  }

  // ── Direct verify-and-register (pass-through to TEE) ──

  async verifyAndRegisterDeal(
    userId: number,
    dto: VerifyAndRegisterDealDto,
  ) {
    this.logger.info(
      `Verifying and registering deal ${dto.params.dealId}`,
      {
        dealId: dto.params.dealId,
        publisherId: dto.publisherId,
        advertiserId: dto.advertiserId,
      },
      'EscrowService',
    );

    // Build TEE payload — forwarding TonConnect signature metadata
    const teePayload = {
      params: dto.params,
      publisher: dto.publisher,
      advertiser: dto.advertiser,
      verificationChatId: dto.verificationChatId,
    };

    const result = await this.teeClient.verifyAndRegisterDeal(teePayload);
    if (result.success && result.txHash !== undefined) {
      await this.dealsService.register(userId, {
        dealId: dto.params.dealId,
        verificationChatId: dto.verificationChatId,
        publisherId: dto.publisherId,
        advertiserId: dto.advertiserId,
        channelId: dto.params.channelId,
      });
      this.logger.info(
        `Deal ${dto.params.dealId} registered in database`,
        { dealId: dto.params.dealId, txHash: result.txHash },
        'EscrowService',
      );
    } else {
      this.logger.warn(
        `Deal ${dto.params.dealId} verification failed`,
        'EscrowService',
      );
    }
    return result;
  }
}
