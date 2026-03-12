import { PrismaClient } from '@prisma/client';
import { SERVICE_CATALOG } from '@nauvvi/shared';

const prisma = new PrismaClient();

async function main() {
  for (const service of SERVICE_CATALOG) {
    await prisma.service.upsert({
      where: { code: service.code },
      update: {
        title: service.title,
        description: service.description,
        shortDescription: service.shortDescription,
        priceTon: service.priceTon,
        etaSeconds: service.etaSeconds,
        inputSchemaJson: service.briefFields,
        outputSchemaJson: service.deliverables,
        isActive: true,
      },
      create: {
        code: service.code,
        title: service.title,
        description: service.description,
        shortDescription: service.shortDescription,
        priceTon: service.priceTon,
        etaSeconds: service.etaSeconds,
        inputSchemaJson: service.briefFields,
        outputSchemaJson: service.deliverables,
      },
    });
  }

  console.log(`Seeded ${SERVICE_CATALOG.length} services.`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
