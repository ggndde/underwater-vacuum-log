
const https = require('https');

const apiKey = process.env.KONEPS_API_KEY || "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const url = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoThng";

function fetch(mode, keyword, logLabel) {
    const params = new URLSearchParams({
        serviceKey: apiKey,
        numOfRows: "5",
        pageNo: "1",
        inqryDiv: mode, // Testing "2"
        inqryBgnDt: "202601200000",
        inqryEndDt: "202602192359",
        type: "json",
        bidNtceNm: keyword
    });

    const fullUrl = `${url}?${params.toString()}`;
    console.log(`\n[${logLabel}] Mode: ${mode}, Keyword: ${keyword}`);

    return new Promise((resolve, reject) => {
        https.get(fullUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const body = json.response?.body;
                    console.log(`[${logLabel}] Total Count: ${body?.totalCount}`);
                    if (body?.items && Array.isArray(body.items)) {
                        body.items.forEach(i => console.log(` - ${i.bidNtceNm}`));
                    } else if (body?.items?.item) {
                        const list = Array.isArray(body.items.item) ? body.items.item : [body.items.item];
                        list.forEach(i => console.log(` - ${i.bidNtceNm}`));
                    }
                    resolve();
                } catch (e) {
                    console.log(`[${logLabel}] Error: ${data.substring(0, 100)}...`);
                    resolve();
                }
            });
        }).on('error', e => {
            console.error(e.message);
            resolve();
        });
    });
}

async function run() {
    // Test Mode 1 (Date) again for baseline
    // await fetch("1", "수영장", "MODE_1_BASELINE");

    // Test Mode 2 (Name?)
    await fetch("2", "수영장", "MODE_2_TEST");

    // Test Mode 2 with nonsense
    await fetch("2", "XYZ_NONSENSE", "MODE_2_TEST_FAIL");
}

run();
