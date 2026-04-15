
const https = require('https');

const apiKey = process.env.KONEPS_API_KEY || "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const url = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoThng";

async function fetchEncoded(keyword, logLabel) {
    const encodedKeyword = encodeURIComponent(keyword);

    // Construct Query String manually to ensure control over encoding
    const queryString = `serviceKey=${apiKey}&numOfRows=5&pageNo=1&inqryDiv=1&inqryBgnDt=202601200000&inqryEndDt=202602192359&type=json&bidNtceNm=${encodedKeyword}`;
    const fullUrl = `${url}?${queryString}`;

    console.log(`\n[${logLabel}] Requesting (Manual Enc): ${fullUrl}`);

    return new Promise((resolve, reject) => {
        https.get(fullUrl, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const body = json.response?.body;
                    console.log(`[${logLabel}] Total Count: ${body?.totalCount}`);
                    if (body?.items) {
                        const list = Array.isArray(body.items) ? body.items : (body.items.item ? [body.items.item] : []);
                        if (list.length > 0) {
                            console.log(`[${logLabel}] First Item: ${list[0].bidNtceNm} (Should contain ${keyword})`);
                        }
                    }
                    resolve();
                } catch (e) {
                    console.log(`[${logLabel}] Error parsing JSON`);
                    resolve();
                }
            });
        }).on('error', e => {
            console.error(e.message);
            resolve();
        });
    });
}

fetchEncoded("수영장", "TEST_ENCODED");
