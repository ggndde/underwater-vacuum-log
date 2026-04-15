import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function clearMeta() {
  // Clear the NaverWorksMeta to forcefully trigger full re-sync for 신규구매 의뢰
  const res = await prisma.naverWorksMeta.deleteMany({});
  console.log(`Cleared ${res.count} items from NaverWorksMeta`);
}

clearMeta()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
