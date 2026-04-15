
const https = require('https');

const apiKey = process.env.KONEPS_API_KEY || "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const url = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoThng";

function fetch(keyword, logLabel) {
    const params = new URLSearchParams({
        serviceKey: apiKey,
        numOfRows: "5",
        pageNo: "1",
        inqryDiv: "1",
        inqryBgnDt: "202601200000",
        inqryEndDt: "202602192359",
        type: "json",
        bidNtceNm: keyword
    });

    const fullUrl = `${url}?${params.toString()}`;
    console.log(`\n[${logLabel}] Requesting: ${keyword}`);

    return new Promise((resolve, reject) => {
        https.get(fullUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const body = json.response?.body;
                    console.log(`[${logLabel}] Total Count: ${body?.totalCount}`);
                    if (body?.items && body.items.length > 0) {
                        console.log(`[${logLabel}] First Item: ${body.items[0].bidNtceNm}`);
                    }
                    resolve();
                } catch (e) {
                    console.log(`[${logLabel}] JSON Parse Error`);
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
    await fetch("수영장", "VALID_KEYWORD");
    await fetch("X_IMPOSSIBLE_KEYWORD_X", "INVALID_KEYWORD");
}

run();
