import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VerifyAndRegisterDealDto } from './verify-and-register-deal.dto';

/** Helper: minimal valid payload matching the TEE's expected schema */
function validPayload() {
  return {
    params: {
      dealId: 1,
      channelId: -1001234567890,
      postId: 123,
      contentHash: '0xabc123',
      duration: 86400,
      publisher: 'EQBqQcjktBg-F8GAFBEcllmTfaxxqCK99ZTqfkOKMFNMmY_o',
      advertiser: 'EQCd2CO7RjXK4E8ngGJJnTon1234567890abcdef',
      amount: '1000000000',
      postedAt: 1700000000,
    },
    verificationChatId: -1001234567890,
    publisherSignature: 'aabbccdd',
    publisherPublicKey: '1122334455',
    advertiserSignature: 'eeff0011',
    advertiserPublicKey: '6677889900',
    publisherId: 100,
    advertiserId: 200,
  };
}

describe('VerifyAndRegisterDealDto', () => {
  it('should validate a valid DTO', async () => {
    const dto = plainToInstance(VerifyAndRegisterDealDto, validPayload());
    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when params is missing', async () => {
    const raw = validPayload();
    delete (raw as Record<string, unknown>).params;

    const dto = plainToInstance(VerifyAndRegisterDealDto, raw);
    const errors = await validate(dto, { forbidUnknownValues: false });
    expect(errors.length).toBeGreaterThan(0);

    const paramsError = errors.find(e => e.property === 'params');
    expect(paramsError).toBeDefined();
  });

  it('should fail validation when signatures are missing', async () => {
    const raw = validPayload();
    delete (raw as Record<string, unknown>).publisherSignature;
    delete (raw as Record<string, unknown>).advertiserSignature;

    const dto = plainToInstance(VerifyAndRegisterDealDto, raw);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);

    const properties = errors.map(e => e.property);
    expect(properties).toContain('publisherSignature');
    expect(properties).toContain('advertiserSignature');
  });

  it('should fail validation when public keys are missing', async () => {
    const raw = validPayload();
    delete (raw as Record<string, unknown>).publisherPublicKey;
    delete (raw as Record<string, unknown>).advertiserPublicKey;

    const dto = plainToInstance(VerifyAndRegisterDealDto, raw);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);

    const properties = errors.map(e => e.property);
    expect(properties).toContain('publisherPublicKey');
    expect(properties).toContain('advertiserPublicKey');
  });

  it('should fail validation when params fields are invalid types', async () => {
    const raw = validPayload();
    (raw.params as Record<string, unknown>).dealId = 'not-a-number';

    const dto = plainToInstance(VerifyAndRegisterDealDto, raw);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when publisher/advertiser addresses are missing', async () => {
    const raw = validPayload();
    delete (raw.params as Record<string, unknown>).publisher;
    delete (raw.params as Record<string, unknown>).advertiser;

    const dto = plainToInstance(VerifyAndRegisterDealDto, raw);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when channelId is missing from params', async () => {
    const raw = validPayload();
    delete (raw.params as Record<string, unknown>).channelId;

    const dto = plainToInstance(VerifyAndRegisterDealDto, raw);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should fail when postedAt is missing from params', async () => {
    const raw = validPayload();
    delete (raw.params as Record<string, unknown>).postedAt;

    const dto = plainToInstance(VerifyAndRegisterDealDto, raw);
    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
