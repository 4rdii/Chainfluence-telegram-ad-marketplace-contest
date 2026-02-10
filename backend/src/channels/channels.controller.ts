import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { ChannelsService } from './channels.service';
import { CreateChannelDto } from './dto/create-channel.dto';
import { UpdateChannelDto } from './dto/update-channel.dto';

@Controller('channels')
export class ChannelsController {
  constructor(private readonly channelsService: ChannelsService) {}

  @Post()
  @UseGuards(JwtAuthGuard)
  create(@CurrentUserId() userId: number, @Body() dto: CreateChannelDto) {
    return this.channelsService.create(userId, dto);
  }

  @Get('mine')
  @UseGuards(JwtAuthGuard)
  findMine(@CurrentUserId() userId: number) {
    return this.channelsService.findMine(userId);
  }

  @Get()
  @Public()
  findAll(@Query('category') category?: string) {
    return this.channelsService.findAll(category);
  }

  @Get(':id/stats')
  @Public()
  getStats(@Param('id') id: string) {
    return this.channelsService.getStats(BigInt(id));
  }

  @Get(':id')
  @Public()
  findOne(@Param('id') id: string) {
    return this.channelsService.findOne(BigInt(id));
  }

  @Patch(':id')
  @UseGuards(JwtAuthGuard)
  update(
    @CurrentUserId() userId: number,
    @Param('id') id: string,
    @Body() dto: UpdateChannelDto,
  ) {
    return this.channelsService.update(userId, BigInt(id), dto);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard)
  remove(@CurrentUserId() userId: number, @Param('id') id: string) {
    return this.channelsService.remove(userId, BigInt(id));
  }
}
