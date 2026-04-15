
const https = require('https');

const apiKey = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";

// Check both Goods (Thng) and Service (Servc) endpoints
const ENDPOINTS = [
    { name: "Goods (Thng)", url: `${BASE_URL}/getBidPblancListInfoThng` },
    { name: "Service (Servc)", url: `${BASE_URL}/getBidPblancListInfoServc` },
    { name: "Construction (Cnstwk)", url: `${BASE_URL}/getBidPblancListInfoCnstwk` }
];

async function fetchBids(endpoint, startDate, endDate) {
    const params = new URLSearchParams({
        serviceKey: apiKey,
        numOfRows: "999", 
        pageNo: "1",
        inqryDiv: "1",
        inqryBgnDt: startDate,
        inqryEndDt: endDate,
        type: "json"
    });

    const url = `${endpoint.url}?${params.toString()}`;
    console.log(`[${endpoint.name}] Fetching...`);

    return new Promise((resolve) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                try {
                    const json = JSON.parse(data);
                    const body = json.response?.body;
                    const items = body?.items;
                    const list = Array.isArray(items) ? items : (items?.item ? [items.item] : []);
                    
                    console.log(` -> Found ${list.length} bids.`);
                    
                    // Search for "길치" or "대전"
                    const matches = list.filter(i => {
                        const title = (i.bidNtceNm || "").toLowerCase();
                        const org = (i.dminsttNm || "").toLowerCase();
                        return title.includes("길치") || org.includes("길치") || title.includes("대전");
                    });

                    if (matches.length > 0) {
                        console.log(` -> MATCHES FOUND in ${endpoint.name}:`);
                        matches.forEach(m => {
                            console.log(`    - [${m.bidNtceNo}] ${m.bidNtceNm} | ${m.dminsttNm} | ${m.bidNtceDt}`);
                        });
                    }

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
    // Search nicely around 2026-01-30
    const start = "202601290000";
    const end = "202601312359";
    
    for (const ep of ENDPOINTS) {
        await fetchBids(ep, start, end);
    }
}

run();
