import { GET } from './src/app/api/cron/naver-works-sync/route';

async function main() {
  console.log("Starting full DB sync worker...");
  const req = new Request('http://localhost');
  
  // NOTE: Depending on how many posts/comments there are, this might take a while.
  console.time('SyncTime');
  const res = await GET(req);
  const data = await res.json();
  console.timeEnd('SyncTime');
  
  console.log("Full Sync Result:", JSON.stringify(data, null, 2));
}

main().catch(console.error);
