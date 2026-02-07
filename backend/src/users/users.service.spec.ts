import { NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UsersService } from './users.service';

describe('UsersService', () => {
  let service: UsersService;
  let prisma: jest.Mocked<Pick<PrismaService, 'user'>>;

  const mockUser = {
    id: BigInt(42),
    username: 'alice',
    walletAddress: null,
    isPublisher: false,
    isAdvertiser: true,
    memberSince: new Date('2024-01-01'),
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      user: {
        findUnique: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<Pick<PrismaService, 'user'>>;
    service = new UsersService(prisma as unknown as PrismaService);
  });

  it('findById throws when user not found', async () => {
    prisma.user.findUnique.mockResolvedValue(null);
    await expect(service.findById(42)).rejects.toThrow(NotFoundException);
  });

  it('findById returns formatted user', async () => {
    prisma.user.findUnique.mockResolvedValue(mockUser);
    const result = await service.findById(42);
    expect(result.id).toBe('42');
    expect(result.username).toBe('alice');
    expect(result.isAdvertiser).toBe(true);
  });

  it('updateMe updates and returns user', async () => {
    prisma.user.update.mockResolvedValue({ ...mockUser, username: 'alice2' });
    const result = await service.updateMe(42, { username: 'alice2' });
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: BigInt(42) },
      data: { username: 'alice2' },
    });
    expect(result.username).toBe('alice2');
  });

  it('updateWallet updates wallet address', async () => {
    prisma.user.update.mockResolvedValue({
      ...mockUser,
      walletAddress: 'EQxxx',
    });
    const result = await service.updateWallet(42, 'EQxxx');
    expect(prisma.user.update).toHaveBeenCalledWith({
      where: { id: BigInt(42) },
      data: { walletAddress: 'EQxxx' },
    });
    expect(result.walletAddress).toBe('EQxxx');
  });
});
