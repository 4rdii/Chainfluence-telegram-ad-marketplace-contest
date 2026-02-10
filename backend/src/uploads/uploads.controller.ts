import {
  Controller,
  Get,
  Param,
  Post,
  Res,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Response } from 'express';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';
import { CurrentUserId } from '../auth/current-user.decorator';
import { Public } from '../auth/public.decorator';
import { UploadsService } from './uploads.service';

@Controller('uploads')
@UseGuards(JwtAuthGuard)
export class UploadsController {
  constructor(private readonly uploadsService: UploadsService) {}

  @Post()
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  async upload(
    @CurrentUserId() userId: number,
    @UploadedFile() file: Express.Multer.File,
  ) {
    if (!file) {
      return { error: 'No file provided' };
    }
    const { fileId } = await this.uploadsService.uploadToTelegram(
      file.buffer,
      file.originalname,
      userId,
    );
    return { fileId, url: `/v1/uploads/${fileId}` };
  }

  @Get(':fileId')
  @Public()
  async getFile(@Param('fileId') fileId: string, @Res() res: Response) {
    const { buffer, contentType } = await this.uploadsService.proxyFile(fileId);
    res.set('Content-Type', contentType);
    res.set('Cache-Control', 'public, max-age=86400');
    res.send(buffer);
  }
}
