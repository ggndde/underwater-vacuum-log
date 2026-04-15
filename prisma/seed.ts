import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Firebase model → our schema category mapping
// CLP → "CP", PLP → "PP", Navi3 → "NV3", 공용 → "공용"

const parts = [
  // ── CLP ──────────────────────────────────────────────────────────
  { name: '구동 바퀴', category: 'CP', articleNo: '122832', stock: 80, lowStockThreshold: 20 },
  { name: '구동 벨트(yellow)', category: 'CP', articleNo: '130169', stock: 22, lowStockThreshold: 4 },
  { name: '구동 브러쉬', category: 'CP', articleNo: '126257', stock: 80, lowStockThreshold: 20 },
  { name: '구동 모터', category: 'CP', articleNo: '122867', stock: 20, lowStockThreshold: 4 },
  { name: '리모컨 cpl.(no display)', category: 'CP', articleNo: '130532', stock: 5, lowStockThreshold: 1 },
  { name: '메인 기판(02type)', category: 'CP', articleNo: '128406', stock: 8, lowStockThreshold: 2 },
  { name: '소켓 인서트', category: 'CP', articleNo: '101884', stock: 32, lowStockThreshold: 10 },
  { name: '소켓 케이스', category: 'CP', articleNo: '122967', stock: 37, lowStockThreshold: 10 },
  { name: '섀시', category: 'CP', articleNo: '123425', stock: 5, lowStockThreshold: 1 },
  { name: '컨트롤 기판', category: 'CP', articleNo: '123931', stock: 2, lowStockThreshold: 1 },
  { name: '케이블 cpl.(40m)', category: 'CP', articleNo: '125548', stock: 2, lowStockThreshold: 1 },
  { name: '펌프 모터(ex)', category: 'CP', articleNo: '125934R', stock: 9, lowStockThreshold: 1 },
  { name: '필터(100my)', category: 'CP', articleNo: '122903', stock: 6, lowStockThreshold: 2 },
  { name: '플러그 케이스', category: 'CP', articleNo: '122978', stock: 34, lowStockThreshold: 10 },
  { name: '플러그 리덕션', category: 'CP', articleNo: '123459', stock: 0, lowStockThreshold: 10 },

  // ── PLP ──────────────────────────────────────────────────────────
  { name: '구동 모터', category: 'PP', articleNo: '126865', stock: 4, lowStockThreshold: 1 },
  { name: '구동 바퀴 & 브러쉬', category: 'PP', articleNo: '130657', stock: 24, lowStockThreshold: 10 },
  { name: '메인 기판', category: 'PP', articleNo: '128796', stock: 4, lowStockThreshold: 1 },
  { name: '소켓 인서트', category: 'PP', articleNo: '101896', stock: 20, lowStockThreshold: 4 },
  { name: '소켓 케이스', category: 'PP', articleNo: '127435', stock: 20, lowStockThreshold: 5 },
  { name: '펌프 모터', category: 'PP', articleNo: '126890', stock: 5, lowStockThreshold: 1 },
  { name: '필터(130my)', category: 'PP', articleNo: '126979', stock: 18, lowStockThreshold: 4 },
  { name: '플러그 인서트', category: 'PP', articleNo: '101892', stock: 20, lowStockThreshold: 5 },
  { name: '플러그 케이스', category: 'PP', articleNo: '101890', stock: 20, lowStockThreshold: 5 },
  { name: '프로텍션 쪽 덮개(스테인리스)', category: 'PP', articleNo: '124981', stock: 10, lowStockThreshold: 2 },

  // ── Navi3 ────────────────────────────────────────────────────────
  { name: '메인 케이블(50m)', category: 'NV3', articleNo: '130545', stock: 1, lowStockThreshold: 1 },
  { name: '톱니 벨트', category: 'NV3', articleNo: '127448', stock: 52, lowStockThreshold: 4 },
  { name: '필터(130my)', category: 'NV3', articleNo: 'NV3-FLT130', stock: 0, lowStockThreshold: 6 },

  // ── 공용 ─────────────────────────────────────────────────────────
  { name: 'AC 케이블(20m)', category: '공용', articleNo: '120762', stock: 3, lowStockThreshold: 1 },
  { name: '실리카겔', category: '공용', articleNo: '114789', stock: 50, lowStockThreshold: 10 },
  { name: '씰 링(필터박스 안 쪽)', category: '공용', articleNo: '125471', stock: 50, lowStockThreshold: 10 },
  { name: '필터 트위스터(m)', category: '공용', articleNo: '128392', stock: 3, lowStockThreshold: 1 },
];

async function main() {
  console.log(`🌱 Seeding ${parts.length} parts...`);
  let created = 0, skipped = 0;

  for (const part of parts) {
    const result = await prisma.part.upsert({
      where: { articleNo: part.articleNo },
      update: {},           // keep existing data as-is
      create: part,
    });
    if (result.createdAt.getTime() === result.updatedAt.getTime()) {
      created++;
      console.log(`  ✅ ${part.category.padEnd(4)} | ${part.name}`);
    } else {
      skipped++;
      console.log(`  ⏩ Already exists: ${part.name}`);
    }
  }

  console.log(`\n✅ Done! Created: ${created}, Already existed: ${skipped}`);
}

main()
  .catch(e => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
