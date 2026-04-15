const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function check() {
  const c = await prisma.workChecklist.findMany({
      orderBy: { id: 'desc' },
      take: 5
  });
  console.log("Latest checklists:");
  for (const item of c) {
      console.log(`- ID: ${item.id}, company: ${item.companyName}, usedParts:`, item.usedParts, "Type:", typeof item.usedParts);
  }
}

check().catch(console.error).finally(() => process.exit(0));
