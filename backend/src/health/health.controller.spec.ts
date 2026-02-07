import { HealthController } from './health.controller';
import { PrismaService } from '../prisma/prisma.service';

describe('HealthController', () => {
  let controller: HealthController;
  let prisma: jest.Mocked<Pick<PrismaService, '$queryRaw'>>;

  beforeEach(() => {
    prisma = {
      $queryRaw: jest.fn().mockResolvedValue(undefined),
    };
    controller = new HealthController(prisma as unknown as PrismaService);
  });

  it('GET /health returns status ok', () => {
    expect(controller.check()).toEqual({ status: 'ok' });
  });

  it('GET /health/ready queries DB and returns ok', async () => {
    const result = await controller.ready();
    expect(prisma.$queryRaw).toHaveBeenCalledWith(expect.anything());
    expect(result).toEqual({ status: 'ok' });
  });
});
