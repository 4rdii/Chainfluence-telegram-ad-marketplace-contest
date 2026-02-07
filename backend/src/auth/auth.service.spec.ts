import { JwtService } from '@nestjs/jwt';
import { AuthService } from './auth.service';
import { LoggerService } from '../logger/logger.service';
import { PrismaService } from '../prisma/prisma.service';
import { TelegramValidationService } from './telegram-validation.service';

describe('AuthService', () => {
  let service: AuthService;
  let telegramValidation: jest.Mocked<TelegramValidationService>;
  let prisma: jest.Mocked<Pick<PrismaService, 'user'>>;
  let jwtService: jest.Mocked<JwtService>;
  let logger: jest.Mocked<LoggerService>;

  beforeEach(() => {
    telegramValidation = {
      validateAndParse: jest.fn(),
    } as unknown as jest.Mocked<TelegramValidationService>;
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
        create: jest.fn(),
      },
    } as unknown as jest.Mocked<Pick<PrismaService, 'user'>>;
    jwtService = { sign: jest.fn().mockReturnValue('fake-jwt') } as unknown as jest.Mocked<JwtService>;
    logger = {
      log: jest.fn(),
      info: jest.fn(),
      debug: jest.fn(),
      error: jest.fn(),
      warn: jest.fn(),
    } as unknown as jest.Mocked<LoggerService>;
    service = new AuthService(
      telegramValidation,
      prisma as unknown as PrismaService,
      jwtService,
      logger,
    );
  });

  it('throws when user data is missing in initData', async () => {
    telegramValidation.validateAndParse.mockReturnValue({
      auth_date: 123,
      hash: 'h',
      user: undefined,
    });
    await expect(service.login('init')).rejects.toThrow('User data missing in initData');
  });

  it('creates user and returns JWT when user does not exist', async () => {
    telegramValidation.validateAndParse.mockReturnValue({
      auth_date: 123,
      hash: 'h',
      user: { id: 999, first_name: 'New', username: 'newuser' },
    });
    prisma.user.findUnique.mockResolvedValue(null);
    prisma.user.create.mockResolvedValue({
      id: BigInt(999),
      username: 'newuser',
      memberSince: new Date(),
      walletAddress: null,
      isPublisher: false,
      isAdvertiser: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.login('init');

    expect(prisma.user.create).toHaveBeenCalledWith({
      data: {
        id: BigInt(999),
        username: 'newuser',
        memberSince: expect.any(Date),
      },
    });
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 999 });
    expect(result).toEqual({ access_token: 'fake-jwt' });
  });

  it('updates existing user and returns JWT', async () => {
    telegramValidation.validateAndParse.mockReturnValue({
      auth_date: 123,
      hash: 'h',
      user: { id: 1, first_name: 'Existing', username: 'updated' },
    });
    prisma.user.findUnique.mockResolvedValue({
      id: BigInt(1),
      username: 'old',
      memberSince: new Date(),
      walletAddress: null,
      isPublisher: false,
      isAdvertiser: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    prisma.user.update.mockResolvedValue({
      id: BigInt(1),
      username: 'updated',
      memberSince: new Date(),
      walletAddress: null,
      isPublisher: false,
      isAdvertiser: true,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.login('init');

    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: BigInt(1) },
      data: { username: 'updated', updatedAt: expect.any(Date) },
    });
    expect(jwtService.sign).toHaveBeenCalledWith({ sub: 1 });
    expect(result).toEqual({ access_token: 'fake-jwt' });
  });
});
