const { execSync } = require('child_process');

console.log("Removing bad Vercel environment variables...");

const keys = ['DATABASE_URL', 'DIRECT_URL', 'NEXTAUTH_SECRET', 'KONEPS_API_KEY'];

for (const key of keys) {
  for (const env of ['production', 'preview', 'development']) {
    try {
      console.log(`Removing ${key} from ${env}...`);
      execSync(`npx vercel env rm ${key} ${env} --yes`, { stdio: 'ignore' });
    } catch (e) {
      // ignore
    }
  }
}

console.log("Adding CORRECT Vercel environment variables...");

const envs = {
  DATABASE_URL: "postgresql://postgres.eqddzvchnpqjvagozcca:GGnDDe93%21208@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true",
  DIRECT_URL: "postgresql://postgres.eqddzvchnpqjvagozcca:GGnDDe93%21208@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres",
  NEXTAUTH_SECRET: "rosin-systech-secret-2024-underwater-vac",
  KONEPS_API_KEY: "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f"
};

for (const [key, value] of Object.entries(envs)) {
  try {
    // Write value to a temp file to safely pipe it
    require('fs').writeFileSync('tmp_val.txt', value);
    execSync(`npx vercel env add ${key} production < tmp_val.txt`, { stdio: 'inherit' });
  } catch(e) {
    console.error(`Failed to add ${key}`);
  }
}

require('fs').unlinkSync('tmp_val.txt');
console.log("Done.");
