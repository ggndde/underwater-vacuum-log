const { execSync } = require('child_process');

const envs = {
  DATABASE_URL: "postgresql://postgres.eqddzvchnpqjvagozcca:GGnDDe93!208@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
  DIRECT_URL: "postgresql://postgres.eqddzvchnpqjvagozcca:GGnDDe93!208@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres",
  NEXTAUTH_SECRET: "rosin-systech-secret-2024-underwater-vac",
  KONEPS_API_KEY: "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f"
};

for (const [key, value] of Object.entries(envs)) {
  console.log(`Setting ${key}...`);
  try {
    execSync(`npx vercel env rm ${key} production preview branch --yes`, { stdio: 'ignore' });
  } catch(e) {}
  
  try {
    // Vercel env add reads from stdin
    execSync(`npx vercel env add ${key} production`, { input: value, stdio: ['pipe', 'inherit', 'inherit'] });
  } catch(e) {
    console.error(`Failed to set ${key}`, e.message);
  }
}
console.log("Environment variables setup complete.");
