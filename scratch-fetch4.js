const KONEPS_API_KEY = "f6f77949a6e42c4b05018c2817bdccf8b4e4abd23656103432e1c6fb6e60553f";
const OP_CNST = "getBidPblancListInfoCnstwk";

async function fetchKoneps() {
    const sStr = "202603010000";
    const eStr = "202603312359";
    const versions = ['', '01', '02', '03', '04', '05', '06'];

    for (const v of versions) {
        const API_BASE_URL = `https://apis.data.go.kr/1230000/BidPublicInfoService${v}`;
        const url = `${API_BASE_URL}/${OP_CNST}?serviceKey=${KONEPS_API_KEY}&numOfRows=10&pageNo=1&inqryDiv=1&inqryBgnDt=${sStr}&inqryEndDt=${eStr}&type=json`;
        
        try {
            console.log(`Trying version ${v || 'no version'}`);
            const response = await fetch(url, { signal: AbortSignal.timeout(5000) });
            console.log(`Status: ${response.status}`);
            if (response.status === 200 || response.status === 400) {
                const text = await response.text();
                // We only care if it doesn't timeout
                console.log('Success or 400 with text:', text.substring(0, 100));
            }
        } catch(e) {
            console.log('Failed:', e.message);
        }
    }
}

fetchKoneps();
