import { Body, Controller, Post, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { EscrowService } from './escrow.service';
import { CreateWalletDto } from './dto/create-wallet.dto';

@Controller('escrow')
@UseGuards(JwtAuthGuard)
export class EscrowController {
  constructor(private readonly escrowService: EscrowService) {}

  @Post('create-wallet')
  createWallet(@Body() dto: CreateWalletDto) {
    return this.escrowService.createWallet(dto.dealId);
  }

  @Post('verify-and-register')
  async verifyAndRegister(
    @CurrentUserId() userId: number,
    @Body() body: { params: { dealId: number }; verificationChatId: number; [key: string]: unknown },
  ) {
    return this.escrowService.verifyAndRegisterDeal(userId, body);
  }
}
