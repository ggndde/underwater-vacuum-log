import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function peek() {
  const deliveries = await prisma.delivery.findMany({
    where: { source: 'naver_works' },
    orderBy: { id: 'desc' },
    take: 5
  });
  
  if (deliveries.length === 0) {
    console.log("아직 입력된 일정이 없습니다. AI가 순차적으로 처리 중입니다...");
    return;
  }
  
  console.log("최근 등록된 납품 일정 5개 미리보기:");
  deliveries.forEach(d => {
    console.log(`- 날짜: ${d.date.toISOString().slice(0, 10)} | 업체: ${d.destination} | 대주제: ${d.productName}`);
  });
}

peek().catch(console.error).finally(() => prisma.$disconnect());
