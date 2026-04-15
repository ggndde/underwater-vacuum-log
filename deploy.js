const { spawnSync } = require('child_process');

console.log("Starting fail-safe Vercel deployment...");

const args = [
  '--prod', '--yes',
  '--build-env', 'DATABASE_URL=postgresql://postgres.eqddzvchnpqjvagozcca:GGnDDe93%21208@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
  '--build-env', 'DIRECT_URL=postgresql://postgres.eqddzvchnpqjvagozcca:GGnDDe93%21208@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres',
  '--env', 'DATABASE_URL=postgresql://postgres.eqddzvchnpqjvagozcca:GGnDDe93%21208@aws-1-ap-southeast-2.pooler.supabase.com:6543/postgres?pgbouncer=true',
  '--env', 'DIRECT_URL=postgresql://postgres.eqddzvchnpqjvagozcca:GGnDDe93%21208@aws-1-ap-southeast-2.pooler.supabase.com:5432/postgres',
  '--build-env', 'NEXTAUTH_SECRET=rosin-systech-secret-2024-underwater-vac',
  '--env', 'NEXTAUTH_SECRET=rosin-systech-secret-2024-underwater-vac',
  '--build-env', 'KONEPS_API_KEY=f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f',
  '--env', 'KONEPS_API_KEY=f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f',
  '--build-env', 'NEXT_PUBLIC_IGNORE_BUILD_ERRORS=true'
];

spawnSync('npx.cmd', ['vercel', ...args], { stdio: 'inherit' });
console.log("Deployment process finished.");
