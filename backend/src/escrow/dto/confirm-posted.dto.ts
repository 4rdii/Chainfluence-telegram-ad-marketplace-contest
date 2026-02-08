import { IsInt, IsString } from 'class-validator';

/**
 * Submitted by the publisher after posting the ad to their channel.
 * The backend uses the stored deal data + signatures to call the TEE.
 */
export class ConfirmPostedDto {
  @IsInt()
  dealId: number;

  /**
   * Telegram post link or message ID.
   * Accepted formats:
   *   - "https://t.me/channel_name/123"
   *   - "123" (just the message ID)
   */
  @IsString()
  postLink: string;
}
