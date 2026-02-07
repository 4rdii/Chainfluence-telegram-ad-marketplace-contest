import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { PrismaService } from '../prisma/prisma.service';
import {
  TelegramValidationService,
  ParsedInitData,
} from './telegram-validation.service';

@Injectable()
export class AuthService {
  constructor(
    private readonly telegramValidation: TelegramValidationService,
    private readonly prisma: PrismaService,
    private readonly jwtService: JwtService,
  ) {}

  async login(initData: string): Promise<{ access_token: string }> {
    const parsed = this.telegramValidation.validateAndParse(initData);
    if (!parsed.user) {
      throw new Error('User data missing in initData');
    }

    const userId = BigInt(parsed.user.id);
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (user) {
      await this.prisma.user.update({
        where: { id: userId },
        data: {
          username: parsed.user.username ?? user.username,
          updatedAt: new Date(),
        },
      });
    } else {
      await this.prisma.user.create({
        data: {
          id: userId,
          username: parsed.user.username ?? null,
          memberSince: new Date(),
        },
      });
    }

    const payload = { sub: parsed.user.id };
    const access_token = this.jwtService.sign(payload);
    return { access_token };
  }
}
