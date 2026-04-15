const fs = require('fs');
const path = require('path');

const files = [
  'src/app/api/bids/route.ts',
  'src/app/api/checklist/route.ts',
  'src/app/api/clients/[id]/route.ts',
  'src/app/api/clients/route.ts',
  'src/app/api/deliveries/route.ts',
  'src/app/api/pools/route.ts',
  'src/app/api/auth/[...nextauth]/route.ts'
];

for (const relPath of files) {
  const filePath = path.join(__dirname, relPath);
  if (fs.existsSync(filePath)) {
    let content = fs.readFileSync(filePath, 'utf8');
    if (!content.includes('force-dynamic')) {
      content = "export const dynamic = 'force-dynamic';\n" + content;
      fs.writeFileSync(filePath, content);
      console.log(`Updated ${relPath}`);
    }
  }
}
