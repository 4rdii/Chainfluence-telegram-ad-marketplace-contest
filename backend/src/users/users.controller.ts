import { Body, Controller, Get, Patch, UseGuards } from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { UsersService } from './users.service';
import { UpdateMeDto } from './dto/update-me.dto';
import { UpdateWalletDto } from './dto/update-wallet.dto';

@Controller('users')
@UseGuards(JwtAuthGuard)
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  getMe(@CurrentUserId() userId: number) {
    return this.usersService.findById(userId);
  }

  @Patch('me')
  updateMe(@CurrentUserId() userId: number, @Body() dto: UpdateMeDto) {
    return this.usersService.updateMe(userId, dto);
  }

  @Patch('me/wallet')
  updateWallet(
    @CurrentUserId() userId: number,
    @Body() dto: UpdateWalletDto,
  ) {
    return this.usersService.updateWallet(userId, dto.walletAddress);
  }
}
