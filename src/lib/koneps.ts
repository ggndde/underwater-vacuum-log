
import { format, parse, eachMonthOfInterval, endOfMonth } from "date-fns";

export interface BidItem {
    bidNtceNo: string;
    bidNtceOrd: string;
    bidNtceNm: string;
    dminsttNm: string;
    bidMethdNm: string;
    cntrctCnclsMthdNm: string;
    ntceInsttNm: string;
    bidNtceDt: string;
    bidClseDt: string;
    bidNtceUrl: string;
    presmptPrce?: string;
    opengDt?: string;
}

interface KonepsResponse {
    response: {
        header: { resultCode: string; resultMsg: string };
        body: {
            items: { item: BidItem[] } | BidItem[];
            numOfRows: number;
            pageNo: number;
            totalCount: number;
        };
    };
}

export const KEYWORDS = [
    "수영장 청소기",
    "수중클리너",
    "수중크리너",
    "수중청소기",
    "수영장 로봇",
    "수중자동청소기",
    "자동청소기",
];

export const POOL_KEYWORDS = [
    "수영장",
    "국민체육센터",
    "복합체육센터",
    "체육센터",
    "다목적체육",
    "풀장",
    "물놀이장"
];

export const NEW_BUILD_KEYWORDS = [
    "건립",
    "신축",
    "조성",
    "증축"
];

const API_BASE_URL = "https://apis.data.go.kr/1230000/ad/BidPublicInfoService";
const OP = "getBidPblancListInfoThng";
const OP_CNST = "getBidPblancListInfoCnstwk";

// Fetch ALL bids for a date range (single month chunk), no keyword filter
async function fetchMonth(sStr: string, eStr: string, op: string = OP): Promise<BidItem[]> {
    const rowsPerPage = 999;
    const queryParams = new URLSearchParams({
        serviceKey: process.env.KONEPS_API_KEY || "",
        numOfRows: rowsPerPage.toString(),
        pageNo: "1",
        inqryDiv: "1",
        inqryBgnDt: sStr,
        inqryEndDt: eStr,
        type: "json",
    });

    const url = `${API_BASE_URL}/${op}`;
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000);
        const response = await fetch(`${url}?${queryParams.toString()}`, { signal: controller.signal });
        clearTimeout(timeoutId);
        if (!response.ok) return [];

        const data: KonepsResponse = await response.json();
        const body = data.response?.body;
        if (!body?.items) return [];

        const raw = body.items;
        const list: BidItem[] = Array.isArray(raw)
            ? raw
            : Array.isArray((raw as any).item)
                ? (raw as any).item
                : [(raw as any).item].filter(Boolean);

        const totalCount = body.totalCount;
        if (totalCount <= rowsPerPage) return list;

        // Fetch remaining pages in parallel batches
        const totalPages = Math.min(Math.ceil(totalCount / rowsPerPage), 20);
        const pages: any[] = [];
        
        const fetchPage = async (p: number) => {
            const pp = new URLSearchParams({
                serviceKey: process.env.KONEPS_API_KEY || "",
                numOfRows: rowsPerPage.toString(),
                pageNo: p.toString(),
                inqryDiv: "1",
                inqryBgnDt: sStr,
                inqryEndDt: eStr,
                type: "json",
            });
            try {
                const controller = new AbortController();
                const timeoutId = setTimeout(() => controller.abort(), 10000);
                const r = await fetch(`${url}?${pp.toString()}`, { signal: controller.signal });
                clearTimeout(timeoutId);
                return r.ok ? await r.json() : null;
            } catch (e) {
                console.error("KONEPS fetch next page error:", e);
                return null;
            }
        };

        for (let i = 2; i <= totalPages; i += 5) {
            const chunk = [];
            for (let j = i; j < i + 5 && j <= totalPages; j++) {
                chunk.push(fetchPage(j));
            }
            const results = await Promise.all(chunk);
            pages.push(...results);
            await new Promise(r => setTimeout(r, 200)); // small delay between batches
        }
        pages.forEach((d: any) => {
            if (!d?.response?.body?.items) return;
            const r = d.response.body.items;
            const items = Array.isArray(r) ? r : Array.isArray(r.item) ? r.item : [r.item].filter(Boolean);
            list.push(...items);
        });
        return list;
    } catch (e) {
        console.error('KONEPS fetch error in fetchMonth:', e);
        return [];
    }
}

async function fetchBidsWithParams(startDate: string, endDate: string, op: string, keywords: string[], requiredKeywords?: string[]): Promise<BidItem[]> {
    const start = parse(startDate, 'yyyyMMddHHmm', new Date());
    const end = parse(endDate, 'yyyyMMddHHmm', new Date());
    const months = eachMonthOfInterval({ start, end });

    const monthResults = [];
    for (const monthStart of months) {
        const monthEnd = endOfMonth(monthStart);
        const sDate = monthStart < start ? start : monthStart;
        const eDate = monthEnd > end ? end : monthEnd;
        
        await new Promise(r => setTimeout(r, 500)); // Delay between month requests
        
        const res = await fetchMonth(
            format(sDate, 'yyyyMMdd') + '0000',
            format(eDate, 'yyyyMMdd') + '2359',
            op
        );
        monthResults.push(res);
    }

    const allItems = monthResults.flat();

    const seen = new Map<string, BidItem>();
    allItems.forEach(item => {
        if (item?.bidNtceNo) seen.set(item.bidNtceNo, item);
    });

    const normalizedKeywords = keywords.map(k => k.replace(/\s+/g, '').toLowerCase());
    const normalizedRequired = requiredKeywords?.map(k => k.replace(/\s+/g, '').toLowerCase()) || [];

    const filtered = Array.from(seen.values()).filter(item => {
        const title = (item.bidNtceNm || '').toLowerCase();
        
        const hasMain = keywords.some((kw, i) =>
            title.includes(kw) || title.includes(normalizedKeywords[i])
        );

        if (!hasMain) return false;

        if (requiredKeywords && requiredKeywords.length > 0) {
            return requiredKeywords.some((req, i) => 
                title.includes(req) || title.includes(normalizedRequired[i])
            );
        }

        return true;
    });

    filtered.sort((a, b) => (b.bidNtceDt || '').localeCompare(a.bidNtceDt || ''));
    return filtered;
}

// Main export for goods
export async function fetchAllBids(startDate: string, endDate: string): Promise<BidItem[]> {
    return fetchBidsWithParams(startDate, endDate, OP, KEYWORDS);
}

// New export for construction (swimming pools)
export async function fetchConstructionBids(startDate: string, endDate: string): Promise<BidItem[]> {
    const cnstBids = await fetchBidsWithParams(startDate, endDate, OP_CNST, POOL_KEYWORDS, NEW_BUILD_KEYWORDS);
    
    const seen = new Map<string, BidItem>();
    cnstBids.forEach(item => {
        if (item?.bidNtceNo) seen.set(item.bidNtceNo, item);
    });
    
    const unique = Array.from(seen.values());
    unique.sort((a, b) => (b.bidNtceDt || '').localeCompare(a.bidNtceDt || ''));
    return unique;
}
