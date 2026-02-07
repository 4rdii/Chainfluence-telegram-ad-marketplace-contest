import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { VerifyAndRegisterDealDto } from './verify-and-register-deal.dto';

describe('VerifyAndRegisterDealDto', () => {
  it('should validate a valid DTO', async () => {
    const dto = plainToInstance(VerifyAndRegisterDealDto, {
      params: {
        dealId: 1,
        publisherId: 100,
        advertiserId: 200,
        amount: 1000,
        duration: 86400,
        postId: 123,
        contentHash: 'abc123',
      },
      verificationChatId: -100,
      publisherId: 100,
      advertiserId: 200,
      channelId: -1001234567890,
      publisherSignature: 'sig1',
      advertiserSignature: 'sig2',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when params is missing', async () => {
    const dto = plainToInstance(VerifyAndRegisterDealDto, {
      verificationChatId: -100,
      publisherId: 100,
      advertiserId: 200,
      publisherSignature: 'sig1',
      advertiserSignature: 'sig2',
    });

    const errors = await validate(dto, { forbidUnknownValues: false });
    expect(errors.length).toBeGreaterThan(0);
    const paramsError = errors.find(e => e.property === 'params');
    expect(paramsError).toBeDefined();
  });

  it('should fail validation when signatures are missing', async () => {
    const dto = plainToInstance(VerifyAndRegisterDealDto, {
      params: {
        dealId: 1,
        publisherId: 100,
        advertiserId: 200,
        amount: 1000,
        duration: 86400,
        postId: 123,
        contentHash: 'abc123',
      },
      verificationChatId: -100,
      publisherId: 100,
      advertiserId: 200,
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
    const properties = errors.map((e) => e.property);
    expect(properties).toContain('publisherSignature');
    expect(properties).toContain('advertiserSignature');
  });

  it('should allow optional channelId', async () => {
    const dto = plainToInstance(VerifyAndRegisterDealDto, {
      params: {
        dealId: 1,
        publisherId: 100,
        advertiserId: 200,
        amount: 1000,
        duration: 86400,
        postId: 123,
        contentHash: 'abc123',
      },
      verificationChatId: -100,
      publisherId: 100,
      advertiserId: 200,
      publisherSignature: 'sig1',
      advertiserSignature: 'sig2',
    });

    const errors = await validate(dto);
    expect(errors).toHaveLength(0);
  });

  it('should fail validation when params fields are invalid types', async () => {
    const dto = plainToInstance(VerifyAndRegisterDealDto, {
      params: {
        dealId: 'not-a-number',
        publisherId: 100,
        advertiserId: 200,
        amount: 1000,
        duration: 86400,
        postId: 123,
        contentHash: 'abc123',
      },
      verificationChatId: -100,
      publisherId: 100,
      advertiserId: 200,
      publisherSignature: 'sig1',
      advertiserSignature: 'sig2',
    });

    const errors = await validate(dto);
    expect(errors.length).toBeGreaterThan(0);
  });
});
