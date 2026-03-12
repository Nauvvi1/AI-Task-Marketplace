import { Controller, Get, Param } from '@nestjs/common';
import { CatalogService } from './catalog.service';

@Controller('catalog')
export class CatalogController {
  constructor(private readonly catalogService: CatalogService) {}

  @Get('services')
  async listServices() {
    return this.catalogService.listServices();
  }

  @Get('services/:code')
  async getService(@Param('code') code: string) {
    return this.catalogService.getServiceByCode(code);
  }
}
