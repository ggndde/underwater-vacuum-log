const fs = require("fs");
const env = fs.readFileSync(".env", "utf-8");
const key = env.match(/KONEPS_API_KEY="(.*)"/)[1];
async function check() {
  const url = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService/getBidPblancListInfoCnstwk";
  const pp = new URLSearchParams({
    serviceKey: key, numOfRows: "1", pageNo: "1", inqryDiv: "1",
    inqryBgnDt: "202510010000", inqryEndDt: "202510312359", type: "json"
  });
  const res = await fetch(url + "?" + pp.toString());
  const data = await res.json();
  console.log(JSON.stringify(data, null, 2));
}
check();
