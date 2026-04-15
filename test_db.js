const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const items = await prisma.workChecklist.findMany({
    orderBy: { createdAt: 'desc' },
    take: 5
  });
  
  for (const item of items) {
    console.log(`ID: ${item.id}, Company: ${item.companyName}`);
    console.log(`  createdAt: ${item.createdAt} (type: ${typeof item.createdAt})`);
    console.log(`  JS Date: ${new Date(item.createdAt).toISOString()}`);
    console.log('---');
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
