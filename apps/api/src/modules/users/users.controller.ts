import { Body, Controller, Get, Param, Patch, Post } from '@nestjs/common';
import { IsOptional, IsString } from 'class-validator';
import { UsersService } from './users.service';

class UpsertUserDto {
  @IsString()
  telegramId!: string;

  @IsOptional()
  @IsString()
  username?: string;

  @IsOptional()
  @IsString()
  firstName?: string;

  @IsOptional()
  @IsString()
  languageCode?: string;
}

class BindWalletDto {
  @IsString()
  walletAddress!: string;
}

@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post('telegram')
  upsertTelegramUser(@Body() dto: UpsertUserDto) {
    return this.usersService.upsertTelegramUser(dto);
  }

  @Patch(':telegramId/wallet')
  bindWallet(@Param('telegramId') telegramId: string, @Body() dto: BindWalletDto) {
    return this.usersService.bindWallet(telegramId, dto.walletAddress);
  }

  @Get(':telegramId')
  getProfile(@Param('telegramId') telegramId: string) {
    return this.usersService.getProfile(telegramId);
  }
}
