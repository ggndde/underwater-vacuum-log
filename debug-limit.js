
const https = require('https');

const apiKey = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoThng";

async function fetchWithLimit(limit) {
    const params = new URLSearchParams({
        serviceKey: apiKey,
        numOfRows: limit.toString(),
        pageNo: "1",
        inqryDiv: "1",
        inqryBgnDt: "202601010000",
        inqryEndDt: "202601022359", // Short range to test limit
        type: "json"
    });

    const url = `${BASE_URL}?${params.toString()}`;
    console.log(`Testing limit: ${limit}`);

    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const count = json.response?.body?.numOfRows;
                    const realCount = json.response?.body?.items?.length || (json.response?.body?.items?.item?.length) || 0;
                    console.log(` -> Requested: ${limit}, Response numOfRows: ${count}, Actual Items: ${realCount}`);
                    resolve();
                } catch (e) {
                    console.log("Error", e.message);
                    resolve();
                }
            });
        });
    });
}

async function run() {
    await fetchWithLimit(200);
    await fetchWithLimit(500);
    await fetchWithLimit(999);
}

run();
