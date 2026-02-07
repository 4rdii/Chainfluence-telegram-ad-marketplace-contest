import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { EscrowService } from './escrow.service';
import { CreateWalletDto } from './dto/create-wallet.dto';
import { VerifyAndRegisterDealDto } from './dto/verify-and-register-deal.dto';
import { SignDealDto } from './dto/sign-deal.dto';
import { ConfirmPostedDto } from './dto/confirm-posted.dto';

@Controller('escrow')
@UseGuards(JwtAuthGuard)
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post('create-wallet')
  createWallet(@Body() dto: CreateWalletDto) {
    return this.escrowService.createWallet(dto.dealId);
  }

  /**
   * Each party submits their TonConnect signData signature.
   * Called twice per deal — once by publisher, once by advertiser.
   * Auto-triggers TEE verification when both signatures are stored.
   */
  @Post('sign-deal')
  signDeal(
    @CurrentUserId() userId: number,
    @Body() dto: SignDealDto,
  ) {
    return this.escrowService.signDeal(userId, dto);
  }

  /**
   * Publisher confirms the ad has been posted to their channel.
   * Sets postId/postedAt. Auto-triggers TEE if both signatures exist.
   */
  @Post('confirm-posted')
  confirmPosted(
    @CurrentUserId() userId: number,
    @Body() dto: ConfirmPostedDto,
  ) {
    return this.escrowService.confirmPosted(userId, dto);
  }

  /**
   * Direct pass-through to TEE verifyAndRegisterDeal.
   * Use this if the frontend has all data (signatures, params) already.
   */
  @Post('verify-and-register')
  async verifyAndRegister(
    @CurrentUserId() userId: number,
    @Body() dto: VerifyAndRegisterDealDto,
  ) {
    return this.escrowService.verifyAndRegisterDeal(userId, dto);
  }
}
