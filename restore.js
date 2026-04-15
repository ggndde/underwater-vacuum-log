const { PrismaClient } = require('@prisma/client');
const fs = require('fs');

const prisma = new PrismaClient();

async function restore() {
  console.log("Starting restore process...");
  const data = JSON.parse(fs.readFileSync('db_dump.json'));
  
  const tables = [
    { key: 'Employee', model: 'employee' },
    { key: 'Customer', model: 'customer' },
    { key: 'Machine', model: 'machine' },
    { key: 'ServiceLog', model: 'serviceLog' },
    { key: 'Quote', model: 'quote' },
    { key: 'Expense', model: 'expense' },
    { key: 'Part', model: 'part' },
    { key: 'StockTransaction', model: 'stockTransaction' },
    { key: 'WorkChecklist', model: 'workChecklist' },
    { key: 'Delivery', model: 'delivery' }
  ];
  
  for (const { key, model } of tables) {
    const rows = data[key];
    if (rows && rows.length > 0) {
      console.log(`Restoring ${rows.length} rows to ${key}...`);
      await prisma[model].createMany({
        data: rows,
        skipDuplicates: true
      });
      // reset seq for PostgreSQL
      try {
        await prisma.$executeRawUnsafe(`SELECT setval(pg_get_serial_sequence('"${key}"', 'id'), coalesce(max(id),0) + 1, false) FROM "${key}";`);
        console.log(`Sequence reset for ${key}`);
      } catch(e) {
        console.error(`Warning: Could not reset sequence for ${key}. This is fine if id is not auto-incremented.`, e);
      }
    }
  }
  console.log("Restore complete!");
}

restore().catch(console.error).finally(() => prisma.$disconnect());
