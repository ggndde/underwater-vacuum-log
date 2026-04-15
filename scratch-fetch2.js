const KONEPS_API_KEY = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const API_BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";
const OP_CNST = "getBidPblancListInfoCnstwk";
const OP = "getBidPblancListInfoThng";

async function fetchKoneps() {
    // Only 1 month to avoid API restrictions
    const sStr = "202603010000";
    const eStr = "202603312359";
    const rowsPerPage = 100;
    const queryParams = new URLSearchParams({
        serviceKey: KONEPS_API_KEY,
        numOfRows: rowsPerPage.toString(),
        pageNo: "1",
        inqryDiv: "1",
        inqryBgnDt: sStr,
        inqryEndDt: eStr,
        type: "json",
    });

    const url = `${API_BASE_URL}/${OP_CNST}?${queryParams.toString()}`;
    console.log('Fetching', url);
    try {
        const response = await fetch(url);
        const text = await response.text();
        console.log(text.substring(0, 1000));
    } catch(e) {
        console.error(e);
    }
}

fetchKoneps();
