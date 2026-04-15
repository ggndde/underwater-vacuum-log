const KONEPS_API_KEY = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const API_BASE_URL = "https://apis.data.go.kr/1230000/BidPublicInfoService04";
const OP_CNST = "getBidPblancListInfoCnstwk";

async function fetchKoneps() {
    const sStr = "202603010000";
    const eStr = "202603312359";
    const rowsPerPage = 10;
    const queryParams = new URLSearchParams({
        serviceKey: KONEPS_API_KEY,
        numOfRows: rowsPerPage.toString(),
        pageNo: "1",
        inqryDiv: "1",
        inqryBgnDt: sStr,
        inqryEndDt: eStr,
        type: "json",
    });

    // To prevent node fetch hanging bugs with URLSearchParams, we manually construct it
    const url = `${API_BASE_URL}/${OP_CNST}?serviceKey=${KONEPS_API_KEY}&numOfRows=10&pageNo=1&inqryDiv=1&inqryBgnDt=${sStr}&inqryEndDt=${eStr}&type=json`;
    console.log('Fetching', url);
    try {
        const response = await fetch(url);
        if (!response.ok) {
            console.log("NOT OK:", response.status, response.statusText);
        }
        const text = await response.text();
        console.log(text.substring(0, 500));
    } catch(e) {
        console.error(e);
    }
}

fetchKoneps();
