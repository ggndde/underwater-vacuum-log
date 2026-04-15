const { execSync } = require('child_process');
try {
  const url = process.argv[2];
  execSync(`npx vercel env add NEXTAUTH_URL production`, { input: url, stdio: ['pipe', 'inherit', 'inherit'] });
  console.log('Successfully set NEXTAUTH_URL');
} catch (e) {
  console.error('Failed to set NEXTAUTH_URL', e);
}
