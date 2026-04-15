const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const prisma = new PrismaClient();

async function dump() {
  console.log("Dumping local SQLite DB...");
  const data = {};
  data.Customer = await prisma.customer.findMany();
  data.Employee = await prisma.employee.findMany();
  data.Machine = await prisma.machine.findMany();
  data.ServiceLog = await prisma.serviceLog.findMany();
  data.Quote = await prisma.quote.findMany();
  data.Expense = await prisma.expense.findMany();
  data.Part = await prisma.part.findMany();
  data.StockTransaction = await prisma.stockTransaction.findMany();
  data.WorkChecklist = await prisma.workChecklist.findMany();
  data.Delivery = await prisma.delivery.findMany();
  
  fs.writeFileSync('db_dump.json', JSON.stringify(data, null, 2));
  console.log("Data dumped to db_dump.json");
}
dump().catch(console.error).finally(() => prisma.$disconnect());
