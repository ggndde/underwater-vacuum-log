
const https = require('https');
const http = require('http');

const apiKey = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";

const endpoints = [
    { label: "ORIG_HTTP", url: "http://apis.data.go.kr/1230000/BidPublicInfoService04/getBidPblancListInfoThng" },
    { label: "STD_HTTPS", url: "https://apis.data.go.kr/1230000/BidPublicInfoService/getBidPblancListInfoThng" }, // Try https standard
    { label: "AD_GENERIC", url: "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfo" }, // Try without 'Thng'
    { label: "SERV03", url: "https://apis.data.go.kr/1230000/BidPublicInfoService03/getBidPblancListInfoThng" },
];

function testEndpoint(endpoint) {
    const params = new URLSearchParams({
        serviceKey: apiKey,
        numOfRows: "2",
        pageNo: "1",
        inqryDiv: "1",
        inqryBgnDt: "202601200000",
        inqryEndDt: "202602192359",
        type: "json",
        bidNtceNm: "수영장" // Include keyword to see if it FILTERS (count should be small)
    });

    const fullUrl = `${endpoint.url}?${params.toString()}`;
    const client = endpoint.url.startsWith('https') ? https : http;

    console.log(`\n[${endpoint.label}] Testing: ${fullUrl}`);

    return new Promise((resolve) => {
        const req = client.get(fullUrl, (res) => {
            console.log(`[${endpoint.label}] Status: ${res.statusCode}`);
            if (res.statusCode !== 200) {
                // console.log(`[${endpoint.label}] Response: ${res.statusCode}`);
                resolve();
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const count = json.response?.body?.totalCount;
                    console.log(`[${endpoint.label}] Success! Count: ${count}`);
                    // If count is ~10000, filtering FAILED. If count is small (e.g. < 50), filtering WORKED.
                    if (count > 5000) console.log(`[${endpoint.label}] -> FILTERING IGNORED (Too many results)`);
                    else if (count >= 0) console.log(`[${endpoint.label}] -> FILTERING WORKED!`);
                } catch (e) {
                    console.log(`[${endpoint.label}] JSON Parse Error`);
                    console.log(data.substring(0, 100)); // Log start of response
                }
                resolve();
            });
        });

        req.on('error', e => {
            console.error(`[${endpoint.label}] Error: ${e.message}`);
            resolve();
        });
    });
}

async function run() {
    for (const ep of endpoints) {
        await testEndpoint(ep);
    }
}

run();
