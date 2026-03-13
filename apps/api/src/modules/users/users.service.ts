import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async upsertTelegramUser(payload: {
    telegramId: string;
    username?: string;
    firstName?: string;
    languageCode?: string;
  }) {
    return this.prisma.user.upsert({
      where: { telegramId: payload.telegramId },
      update: {
        username: payload.username,
        firstName: payload.firstName,
        languageCode: payload.languageCode,
        lastSeenAt: new Date(),
      },
      create: {
        telegramId: payload.telegramId,
        username: payload.username,
        firstName: payload.firstName,
        languageCode: payload.languageCode,
        lastSeenAt: new Date(),
      },
    });
  }

  async bindWallet(telegramId: string, walletAddress: string) {
    return this.prisma.user.upsert({
      where: { telegramId },
      update: {
        walletAddress,
        lastSeenAt: new Date(),
      },
      create: {
        telegramId,
        walletAddress,
        lastSeenAt: new Date(),
      },
    });
  }

  async getProfile(telegramId: string) {
    return this.prisma.user.findUnique({ where: { telegramId } });
  }
}