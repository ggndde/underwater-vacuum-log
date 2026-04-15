const fs = require("fs");
const env = fs.readFileSync(".env", "utf-8");
const keyMatches = env.match(/KONEPS_API_KEY="(.*)"/);
process.env.KONEPS_API_KEY = keyMatches ? keyMatches[1] : "";

async function fetchMonth() {
    const url = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoCnstwk";
    const pp = new URLSearchParams({
        serviceKey: process.env.KONEPS_API_KEY,
        numOfRows: "20",
        pageNo: "1",
        inqryDiv: "1",
        inqryBgnDt: "202510010000",
        inqryEndDt: "202510312359",
        type: "json"
    });
    const res = await fetch(url + "?" + pp.toString());
    const data = await res.json();
    console.log(data?.response?.body?.items?.item ? "Has Items" : "No Items");
}
fetchMonth().catch(console.error);
