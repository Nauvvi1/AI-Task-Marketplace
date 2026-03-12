import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class CatalogService {
  constructor(private readonly prisma: PrismaService) {}

  async listServices() {
    return this.prisma.service.findMany({ where: { isActive: true }, orderBy: { createdAt: 'asc' } });
  }

  async getServiceByCode(code: string) {
    return this.prisma.service.findUnique({ where: { code } });
  }
}
