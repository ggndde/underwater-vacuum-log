const fs = require('fs');
const path = require('path');

const pages = [
  'bids/page.tsx',
  'checklist/new/page.tsx',
  'checklist/page.tsx',
  'clients/[id]/log/new/page.tsx',
  'clients/[id]/logs/[logId]/expense/page.tsx',
  'clients/[id]/logs/[logId]/photos/page.tsx',
  'clients/[id]/logs/[logId]/quote/page.tsx',
  'clients/[id]/machines/[machineId]/page.tsx',
  'clients/[id]/page.tsx',
  'clients/page.tsx',
  'delivery/page.tsx',
  'login/page.tsx',
  'page.tsx',
  'parts/page.tsx',
  'pools/page.tsx'
];

for (const relPath of pages) {
  const filePath = path.join(__dirname, 'src/app', relPath);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('force-dynamic')) {
      content = "export const dynamic = 'force-dynamic';\n" + content;
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${relPath}`);
    }
  }
}
