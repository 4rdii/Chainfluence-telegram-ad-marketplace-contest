import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import request from 'supertest';
import { HealthModule } from '../src/health/health.module';
import { PrismaModule } from '../src/prisma/prisma.module';
import { PrismaService } from '../src/prisma/prisma.service';

describe('Health (e2e)', () => {
  let app: INestApplication;

  beforeEach(async () => {
    const mockPrisma = {
      $queryRaw: jest.fn().mockResolvedValue(undefined),
    };
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [PrismaModule, HealthModule],
    })
      .overrideProvider(PrismaService)
      .useValue(mockPrisma)
      .compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterEach(async () => {
    await app?.close();
  });

  it('GET /health returns 200 and status ok', () => {
    return request(app.getHttpServer())
      .get('/health')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ status: 'ok' });
      });
  });

  it('GET /health/ready returns 200 and status ok', () => {
    return request(app.getHttpServer())
      .get('/health/ready')
      .expect(200)
      .expect((res) => {
        expect(res.body).toEqual({ status: 'ok' });
      });
  });
});
