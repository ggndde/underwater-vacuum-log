
const https = require('https');

// Mock date-fns
const format = (d, f) => {
    // simplified format for yyyyMMdd
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, '0');
    const dd = String(d.getDate()).padStart(2, '0');
    return `${yyyy}${mm}${dd}`;
};

const apiKey = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const API_BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";
const OPS = { thng: "getBidPblancListInfoThng" };

async function fetchUrl(url) {
    return new Promise((resolve, reject) => {
        https.get(url, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, json: () => JSON.parse(data), text: () => data });
            });
            res.on('error', reject);
        });
    });
}

async function run() {
    const sStr = "202601010000";
    const eStr = "202601312359";
    const rowsPerPage = 999;

    console.log(`Fetching ${sStr} - ${eStr}...`);

    // 1. Fetch Page 1
    const queryParams = new URLSearchParams({
        serviceKey: apiKey,
        numOfRows: rowsPerPage.toString(),
        pageNo: "1",
        inqryDiv: "1",
        inqryBgnDt: sStr,
        inqryEndDt: eStr,
        type: "json",
    });

    const url = `${API_BASE_URL}/${OPS.thng}?${queryParams.toString()}`;

    try {
        const response = await fetchUrl(url);
        console.log(`Page 1 Status: ${response.status}`);

        if (!response.ok) {
            console.log("Page 1 failed.");
            console.log(await response.text());
            return;
        }

        const data = await response.json();
        const body = data.response?.body;

        if (!body) {
            console.log("No body in response:", JSON.stringify(data).slice(0, 200));
            return;
        }

        console.log(`Total Count: ${body.totalCount}`);

        if (body.totalCount > rowsPerPage) {
            const totalPages = Math.ceil(body.totalCount / rowsPerPage);
            const maxPages = Math.min(totalPages, 20);
            console.log(`Need to fetch pages 2 to ${maxPages}`);

            const pagePromises = [];
            for (let p = 2; p <= maxPages; p++) {
                const pageParams = new URLSearchParams({
                    serviceKey: apiKey,
                    numOfRows: rowsPerPage.toString(),
                    pageNo: p.toString(),
                    inqryDiv: "1",
                    inqryBgnDt: sStr,
                    inqryEndDt: eStr,
                    type: "json",
                });

                console.log(`Queueing page ${p}...`);
                pagePromises.push(
                    fetchUrl(`${API_BASE_URL}/${OPS.thng}?${pageParams.toString()}`)
                        .then(res => {
                            if (!res.ok) throw new Error(`Status ${res.status}`);
                            return res.json();
                        })
                        .catch(err => {
                            console.warn(`Failed to fetch page ${p}`, err.message);
                            return null;
                        })
                );
            }

            const results = await Promise.all(pagePromises);
            console.log(`Results: ${results.length} pages returned (including nulls)`);
            const valid = results.filter(r => r);
            console.log(`Valid pages: ${valid.length}`);
        } else {
            console.log("Single page sufficient.");
        }

    } catch (e) {
        console.error("Main error:", e);
    }
}

run();
