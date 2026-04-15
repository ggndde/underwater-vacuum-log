const { execSync } = require('child_process');

const envs = {
  DATABASE_URL: "postgresql://postgres.eqddzvchnpqjvagozcca:GGnDDe93%21208@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
  DIRECT_URL: "postgresql://postgres.eqddzvchnpqjvagozcca:GGnDDe93%21208@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres"
};

for (const [key, value] of Object.entries(envs)) {
  console.log(`Setting ${key}...`);
  try {
    execSync(`npx vercel env rm ${key} production --yes`, { stdio: 'ignore' });
  } catch(e) {}
  
  try {
    execSync(`npx vercel env add ${key} production`, { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
  } catch(e) {
    console.error(`Failed to set ${key}`, e.message);
  }
}
console.log("Environment variables fix complete.");
