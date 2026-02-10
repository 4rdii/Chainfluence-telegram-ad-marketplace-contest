import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class UploadsService {
  private baseUrl: string;
  private token: string;

  constructor(private readonly config: ConfigService) {
    const token = this.config.get<string>('telegram.botToken');
    if (!token) {
      throw new Error('TELEGRAM_BOT_TOKEN not configured');
    }
    this.token = token;
    this.baseUrl = `https://api.telegram.org/bot${token}`;
  }

  /**
   * Send a photo to the user's own DM via Bot API, return the file_id.
   */
  async uploadToTelegram(
    buffer: Buffer,
    filename: string,
    userId: number,
  ): Promise<{ fileId: string }> {
    const formData = new FormData();
    formData.append('chat_id', userId.toString());
    formData.append('photo', new Blob([buffer]), filename);
    // Send silently so user doesn't get spammed
    formData.append('disable_notification', 'true');

    const res = await fetch(`${this.baseUrl}/sendPhoto`, {
      method: 'POST',
      body: formData,
    });
    const data = (await res.json()) as {
      ok: boolean;
      result?: { photo?: { file_id: string; file_size: number }[] };
      description?: string;
    };

    if (!data.ok || !data.result?.photo?.length) {
      throw new Error(
        `sendPhoto failed: ${data.description || JSON.stringify(data)}`,
      );
    }

    // Return the highest-resolution version (last in the array)
    const photos = data.result.photo;
    return { fileId: photos[photos.length - 1].file_id };
  }

  /**
   * Fetch file bytes from Telegram for proxying to the client.
   */
  async proxyFile(fileId: string): Promise<{ buffer: Buffer; contentType: string }> {
    // Step 1: get file path from Telegram
    const res = await fetch(
      `${this.baseUrl}/getFile?file_id=${encodeURIComponent(fileId)}`,
    );
    const data = (await res.json()) as {
      ok: boolean;
      result?: { file_path?: string };
    };
    if (!data.ok || !data.result?.file_path) {
      throw new Error('getFile failed');
    }

    // Step 2: download from Telegram file server
    const fileUrl = `https://api.telegram.org/file/bot${this.token}/${data.result.file_path}`;
    const fileRes = await fetch(fileUrl);
    if (!fileRes.ok) {
      throw new Error(`Failed to download file: ${fileRes.status}`);
    }

    const arrayBuffer = await fileRes.arrayBuffer();
    const contentType = fileRes.headers.get('content-type') || 'image/jpeg';

    return { buffer: Buffer.from(arrayBuffer), contentType };
  }
}
