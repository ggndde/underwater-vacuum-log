
const https = require('https');
const { format, addMonths, startOfMonth, endOfMonth, parse } = require('date-fns');

const apiKey = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoThng";

async function fetchMonth(year, month) {
    const sDate = new Date(year, month - 1, 1);
    const eDate = endOfMonth(sDate);

    const sStr = format(sDate, 'yyyyMMdd') + '0000';
    const eStr = format(eDate, 'yyyyMMdd') + '2359';

    let pageNo = 1;
    let allItems = [];

    console.log(`Fetching ${sStr} to ${eStr}...`);

    while (true) {
        const params = new URLSearchParams({
            serviceKey: apiKey,
            numOfRows: "999",
            pageNo: pageNo.toString(),
            inqryDiv: "1",
            inqryBgnDt: sStr,
            inqryEndDt: eStr,
            type: "json"
        });

        const url = `${BASE_URL}?${params.toString()}`;

        await new Promise((resolve) => {
            https.get(url, (res) => {
                let data = '';
                res.on('data', c => data += c);
                res.on('end', () => {
                    try {
                        const json = JSON.parse(data);
                        const body = json.response?.body;
                        const items = body?.items;
                        const list = Array.isArray(items) ? items : (items?.item ? [items.item] : []);

                        allItems = [...allItems, ...list];
                        console.log(` -> Page ${pageNo}: Fetched ${list.length} items. Total so far: ${allItems.length}`);

                        if (allItems.length >= body?.totalCount || list.length === 0) {
                            pageNo = -1; // Stop
                        } else {
                            pageNo++;
                        }
                        resolve();
                    } catch (e) {
                        console.log("Error", e.message);
                        pageNo = -1;
                        resolve();
                    }
                });
            });
        });

        if (pageNo === -1 || pageNo > 20) break;
    }

    console.log(`Total Fetched: ${allItems.length}`);
    const matches = allItems.filter(i => (i.bidNtceNm || "").includes("청소"));
    console.log(`Matches: ${matches.length}`);
    if (matches.length > 0) console.log(`Example: ${matches[0].bidNtceNm}`);
}

async function run() {
    await fetchMonth(2026, 1);
}

run();
