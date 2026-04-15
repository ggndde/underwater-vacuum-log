import { fetchConstructionBids } from './src/lib/koneps';
process.env.KONEPS_API_KEY = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";

async function run() {
    // Test 1 recent month instead of 6 months
    const sDate = "202603010000";
    const eDate = "202603312359";
    console.log("Fetching from", sDate, "to", eDate);
    const results = await fetchConstructionBids(sDate, eDate);
    console.log("Results count:", results.length);
    if (results.length > 0) {
        console.log("First item:", results[0]);
    }
}

run();
