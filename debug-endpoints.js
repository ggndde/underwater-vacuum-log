
const https = require('https');

const apiKey = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";

// Trying Service03 and Service02 as fallback, and also checking if 'ad' endpoint supports 'getBidPblancListInfo' (without Thng?)
const endpoints = [
    "http://apis.data.go.kr/1230000/BidPublicInfoService04/getBidPblancListInfoThng", // Original (failed 500)
    "https://apis.data.go.kr/1230000/BidPublicInfoService/getBidPblancListInfoThng", // Standard HTTPS (might work?)
    "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfo", // 'ad' generic
];

async function testEndpoint(url, label) {
    const params = new URLSearchParams({
        serviceKey: apiKey,
        numOfRows: "2",
        pageNo: "1",
        inqryDiv: "1",
        inqryBgnDt: "202601200000",
        inqryEndDt: "202602192359",
        type: "json",
    });

    const fullUrl = `${url}?${params.toString()}`;
    console.log(`\n[${label}] Testing: ${url}`);

    return new Promise((resolve) => {
        https.get(fullUrl, (res) => {
            console.log(`[${label}] Status: ${res.statusCode}`);
            if (res.statusCode !== 200) {
                // console.log(`[${label}] Failed`);
                resolve();
                return;
            }
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    console.log(`[${label}] Result: Success (Count: ${json.response?.body?.totalCount || 0})`);
                } catch (e) {
                    console.log(`[${label}] JSON Parse Error`);
                }
                resolve();
            });
        }).on('error', e => {
            console.error(`[${label}] Error: ${e.message}`);
            resolve();
        });
    });
}

async function run() {
    await testEndpoint(endpoints[0], "ORIG_HTTP");
    await testEndpoint(endpoints[1], "STD_HTTPS");
    await testEndpoint(endpoints[2], "AD_GENERIC");
}

run();
