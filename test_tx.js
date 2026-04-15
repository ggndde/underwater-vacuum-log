const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function test() {
  const c = await prisma.workChecklist.findFirst();
  console.log('first checklist id =', c.id);
  const p = await prisma.part.findFirst();
  console.log('first part id =', p.id);
  
  const usedPartsArray = c.usedParts ? JSON.parse(c.usedParts) : [];
  usedPartsArray.push({ partId: p.id, partName: p.name, qty: 1 });
  
  try {
      await prisma.$transaction([
          prisma.part.update({
              where: { id: p.id },
              data: { stock: { decrement: 1 } }
          }),
          prisma.stockTransaction.create({
              data: { partId: p.id, delta: -1, transactionType: '현장사용', note: 'test', performedBy: 'test' }
          }),
          (prisma).workChecklist.update({
              where: { id: c.id },
              data: { usedParts: JSON.stringify(usedPartsArray) }
          })
      ]);
      console.log('transaction succesful');
  } catch (e) {
      console.error("TRANSACTION ERROR:", e);
  }
}
test().catch(e => { console.error('ERROR =>', e); process.exit(1); })
