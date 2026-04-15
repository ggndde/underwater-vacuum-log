const { execSync } = require('child_process');
const fs = require('fs');

console.log("Reading .env file...");
const envContent = fs.readFileSync('.env', 'utf-8');
const envsToSet = {};

envContent.split('\n').forEach(line => {
  const match = line.match(/^([^=]+)="(.+?)"$/);
  if (match) {
    envsToSet[match[1]] = match[2].replace(/\\n/g, '\n');
  }
});

const targetKeys = [
  'OPENAI_API_KEY',
  'NAVER_WORKS_CLIENT_ID',
  'NAVER_WORKS_CLIENT_SECRET',
  'NAVER_WORKS_PRIVATE_KEY'
];

for (const key of targetKeys) {
  const value = envsToSet[key];
  if (!value) {
    console.log(`Skipping ${key} as it is missing in .env`);
    continue;
  }
  
  console.log(`Setting ${key} in Vercel production...`);
  
  try {
    // Try remove first if it exists
    execSync(`npx vercel env rm ${key} production --yes`, { stdio: 'ignore' });
  } catch(e) {}
  
  try {
    execSync(`npx vercel env add ${key} production`, { 
      input: value, 
      stdio: ['pipe', 'inherit', 'inherit'] 
    });
    console.log(`Successfully set ${key}`);
  } catch(e) {
    console.error(`Failed to set ${key}:`, e.message);
  }
}
console.log("Environment variables sync to Vercel complete.");
