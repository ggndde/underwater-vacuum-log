import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function resetAndSync() {
  console.log("Clearing NaverWorks deliveries...");
  await prisma.delivery.deleteMany({ where: { source: 'naver_works' } });
  
  console.log("Clearing NaverWorksMeta...");
  await prisma.naverWorksMeta.deleteMany({});
  
  console.log("Done clearing. You can run syncWorker.ts now.");
}

resetAndSync()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
