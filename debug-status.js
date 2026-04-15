
const https = require('https');

const apiKey = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const API_BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";

async function checkStatus() {
    const params = new URLSearchParams({
        serviceKey: apiKey,
        numOfRows: "10",
        pageNo: "1",
        inqryDiv: "1",
        inqryBgnDt: "202602010000",
        inqryEndDt: "202602012359",
        type: "json"
    });

    const url = `${API_BASE_URL}/getBidPblancListInfoThng?${params.toString()}`;

    console.log("Checking API Status...");

    https.get(url, (res) => {
        console.log(`Status Code: ${res.statusCode}`);
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            if (res.statusCode === 200) {
                console.log("Success! API is alive.");
            } else {
                console.log("Failed.");
                console.log(data.slice(0, 500)); // Print start of error
            }
        });
    }).on('error', (e) => {
        console.error("Network Error:", e.message);
    });
}

checkStatus();
