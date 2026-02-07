import { ForbiddenException, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { DealsService } from './deals.service';
import { RegisterDealDto } from './dto/register-deal.dto';

describe('DealsService', () => {
  let service: DealsService;
  let prisma: jest.Mocked<Pick<PrismaService, 'deal'>>;

  const mockDeal = {
    id: 1,
    dealId: 100,
    publisherId: BigInt(1),
    advertiserId: BigInt(2),
    channelId: BigInt(-100),
    verificationChatId: BigInt(-100123),
    status: 'active',
    releasedAt: null,
    refundedAt: null,
    txHash: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  beforeEach(() => {
    prisma = {
      deal: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
        create: jest.fn(),
        update: jest.fn(),
      },
    } as unknown as jest.Mocked<Pick<PrismaService, 'deal'>>;
    service = new DealsService(prisma as unknown as PrismaService);
  });

  it('register returns existing deal when dealId already exists', async () => {
    const dto: RegisterDealDto = {
      dealId: 100,
      verificationChatId: -100123,
      publisherId: 1,
      advertiserId: 2,
    };
    prisma.deal.findUnique.mockResolvedValue(mockDeal);
    const result = await service.register(1, dto);
    expect(result.dealId).toBe(100);
    expect(result.verificationChatId).toBe('-100123');
    expect(prisma.deal.create).not.toHaveBeenCalled();
  });

  it('register creates new deal when dealId does not exist', async () => {
    const dto: RegisterDealDto = {
      dealId: 101,
      verificationChatId: -100456,
      publisherId: 10,
      advertiserId: 20,
      channelId: -200,
    };
    prisma.deal.findUnique.mockResolvedValue(null);
    prisma.deal.create.mockResolvedValue({ ...mockDeal, dealId: 101 });
    const result = await service.register(1, dto);
    expect(prisma.deal.create).toHaveBeenCalledWith({
      data: {
        dealId: 101,
        publisherId: BigInt(10),
        advertiserId: BigInt(20),
        channelId: BigInt(-200),
        verificationChatId: BigInt(-100456),
        status: 'active',
      },
    });
    expect(result.dealId).toBe(101);
  });

  it('findAll filters by userId as publisher or advertiser', async () => {
    prisma.deal.findMany.mockResolvedValue([mockDeal]);
    await service.findAll(1);
    expect(prisma.deal.findMany).toHaveBeenCalledWith({
      where: {
        OR: [{ publisherId: BigInt(1) }, { advertiserId: BigInt(1) }],
      },
      orderBy: { createdAt: 'desc' },
    });
  });

  it('findOne throws when deal not found', async () => {
    prisma.deal.findUnique.mockResolvedValue(null);
    await expect(service.findOne(1, 999)).rejects.toThrow(NotFoundException);
  });

  it('findOne throws Forbidden when user is not party to deal', async () => {
    prisma.deal.findUnique.mockResolvedValue(mockDeal);
    await expect(service.findOne(99, 100)).rejects.toThrow(ForbiddenException);
  });

  it('findOne returns formatted deal when user is party', async () => {
    prisma.deal.findUnique.mockResolvedValue(mockDeal);
    const result = await service.findOne(1, 100);
    expect(result.dealId).toBe(100);
    expect(result.status).toBe('active');
    expect(result.publisherId).toBe('1');
    expect(result.advertiserId).toBe('2');
  });

  it('findActiveDeals returns only active deals', async () => {
    prisma.deal.findMany.mockResolvedValue([mockDeal]);
    const result = await service.findActiveDeals();
    expect(prisma.deal.findMany).toHaveBeenCalledWith({
      where: { status: 'active' },
    });
    expect(result).toHaveLength(1);
  });

  it('updateDealStatus updates deal with released', async () => {
    prisma.deal.update.mockResolvedValue({
      ...mockDeal,
      status: 'released',
      releasedAt: new Date(),
      txHash: 'tx123',
    } as never);
    await service.updateDealStatus(100, 'released', 'tx123');
    expect(prisma.deal.update).toHaveBeenCalledWith({
      where: { dealId: 100 },
      data: expect.objectContaining({
        status: 'released',
        txHash: 'tx123',
        releasedAt: expect.any(Date),
      }),
    });
  });

  it('updateDealStatus updates deal with refunded', async () => {
    prisma.deal.update.mockResolvedValue({
      ...mockDeal,
      status: 'refunded',
      refundedAt: new Date(),
    } as never);
    await service.updateDealStatus(100, 'refunded');
    expect(prisma.deal.update).toHaveBeenCalledWith({
      where: { dealId: 100 },
      data: expect.objectContaining({
        status: 'refunded',
        refundedAt: expect.any(Date),
      }),
    });
  });
});
