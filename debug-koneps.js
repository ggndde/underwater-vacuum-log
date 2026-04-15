
const https = require('https');

const apiKey = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const url = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoThng";

const params = new URLSearchParams({
    serviceKey: apiKey,
    numOfRows: "2",
    pageNo: "1",
    inqryDiv: "1",
    inqryBgnDt: "202601200000",
    inqryEndDt: "202602192359",
    type: "json",
    bidNtceNm: "청소" // Adding keyword "cleaning"
});

const fullUrl = `${url}?${params.toString()}`;
console.log(`\nChecking 2026 Data: ${fullUrl}`);

https.get(fullUrl, (res) => {
    let data = '';
    res.on('data', chunk => data += chunk);
    res.on('end', () => {
        try {
            const json = JSON.parse(data);
            // Log the whole body to see if items exist
            console.log(JSON.stringify(json.response?.body, null, 2));
        } catch (e) {
            console.log(data);
        }
    });
}).on('error', e => console.error(e.message));
