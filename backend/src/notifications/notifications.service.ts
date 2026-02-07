import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class NotificationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: number, type: string, title: string, body?: string) {
    return this.prisma.notification.create({
      data: {
        userId: BigInt(userId),
        type,
        title,
        body: body ?? null,
      },
    });
  }

  async findAll(userId: number) {
    const list = await this.prisma.notification.findMany({
      where: { userId: BigInt(userId) },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return list.map(this.toResponse);
  }

  async markRead(userId: number, id: number) {
    const n = await this.prisma.notification.findUnique({
      where: { id },
    });
    if (!n) {
      throw new NotFoundException('Notification not found');
    }
    if (n.userId !== BigInt(userId)) {
      throw new ForbiddenException('Not your notification');
    }
    const updated = await this.prisma.notification.update({
      where: { id },
      data: { readAt: new Date() },
    });
    return this.toResponse(updated);
  }

  async markAllRead(userId: number) {
    await this.prisma.notification.updateMany({
      where: { userId: BigInt(userId), readAt: null },
      data: { readAt: new Date() },
    });
    return { ok: true };
  }

  private toResponse(n: {
    id: number;
    userId: bigint;
    type: string;
    title: string;
    body: string | null;
    readAt: Date | null;
    createdAt: Date;
  }) {
    return {
      id: n.id,
      type: n.type,
      title: n.title,
      body: n.body,
      readAt: n.readAt?.toISOString() ?? null,
      createdAt: n.createdAt.toISOString(),
    };
  }
}
