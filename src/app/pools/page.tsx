'use client';

import { useState, useEffect } from 'react';
import { format, subMonths, parse, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Search, ExternalLink, Calendar, RefreshCw, AlertCircle, Clock, DollarSign, Building2 } from 'lucide-react';

interface BidItem {
    bidNtceNo: string;
    bidNtceOrd: string;
    bidNtceNm: string;
    dminsttNm: string;
    bidNtceDt: string;
    bidClseDt: string;
    bidNtceUrl: string;
    ntceInsttNm: string;
    bidMethdNm?: string;
    cntrctCnclsMthdNm?: string;
    presmptPrce?: string;
    opengDt?: string;
}

export default function PoolsPage() {
    const [bids, setBids] = useState<BidItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState(format(subMonths(new Date(), 1), 'yyyy-MM-dd')); // Changed default to 1 month
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showClosed, setShowClosed] = useState(true); // For building projects, closed bids are still valid targets!
    const [loadingProgress, setLoadingProgress] = useState<string>('');

    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        fetchBids();
    }, []);

    const fetchBids = async () => {
        setLoading(true);
        setLoadingProgress('초기화 중...');
        setError(null);
        setBids([]);

        try {
            const start = parseDate(startDate + ' 00:00:00');
            const end = parseDate(endDate + ' 23:59:59');
            
            // Build monthly chunks
            const chunks = [];
            let current = new Date(start);
            while (current <= end) {
                const nextMonth = new Date(current.getFullYear(), current.getMonth() + 1, 0, 23, 59, 59);
                const chunkEnd = nextMonth < end ? nextMonth : end;
                chunks.push({
                    s: format(current, 'yyyyMMdd') + '0000',
                    e: format(chunkEnd, 'yyyyMMdd') + '2359'
                });
                current = new Date(chunkEnd);
                current.setDate(current.getDate() + 1);
                current.setHours(0, 0, 0, 0);
            }

            let allItems: BidItem[] = [];

            for (let i = 0; i < chunks.length; i++) {
                const chunk = chunks[i];
                setLoadingProgress(`데이터 연동 중... (${i + 1}/${chunks.length}개월 완료)`);
                const res = await fetch(`/api/pools?startDate=${chunk.s}&endDate=${chunk.e}`);
                const data = await res.json();

                if (!res.ok) {
                    throw new Error(data.error || 'API 요청 실패');
                }

                if (data.items && data.items.length > 0) {
                    allItems = [...allItems, ...data.items];
                    // Sort descending by date
                    allItems.sort((a, b) => (b.bidNtceDt || '').localeCompare(a.bidNtceDt || ''));
                    setBids(allItems); // Update UI incrementally
                }
            }
            
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Failed to fetch pool construction bids", error);
            setError("데이터를 불러오는데 실패했습니다. 엄청난 양의 공공데이터를 동기화하는 중 지연이 발생했을 수 있습니다.");
        } finally {
            setLoading(false);
            setLoadingProgress('');
        }
    };

    const parseDate = (dateStr: string) => {
        try {
            if (!dateStr) return new Date();
            return parse(dateStr, 'yyyy-MM-dd HH:mm:ss', new Date());
        } catch (e) {
            return new Date();
        }
    };

    const formatCurrency = (val?: string) => {
        if (!val) return '-';
        return Number(val).toLocaleString('ko-KR') + '원';
    };

    const getDDay = (dateStr: string) => {
        const target = parseDate(dateStr);
        const today = new Date();
        const diff = differenceInDays(target, today);

        if (diff < 0) return { label: '투찰마감', color: 'bg-slate-200 text-slate-500 dark:bg-slate-700 dark:text-slate-400' };
        if (diff === 0) return { label: 'D-Day', color: 'bg-red-100 text-red-600 font-bold dark:bg-red-900/40 dark:text-red-400' };
        if (diff <= 3) return { label: `D-${diff}`, color: 'bg-orange-100 text-orange-600 font-bold dark:bg-orange-900/40 dark:text-orange-400' };
        return { label: `D-${diff}`, color: 'bg-green-100 text-green-600 dark:bg-green-900/40 dark:text-green-400' };
    };

    const isNewBid = (dateStr: string) => {
        const bidDate = parseDate(dateStr);
        const now = new Date();
        return (now.getTime() - bidDate.getTime()) < 3 * 24 * 60 * 60 * 1000; // 3 days for construction as "NEW"
    };

    const getBidUrl = (bid: BidItem) => {
        if (bid.bidNtceUrl && bid.bidNtceUrl.startsWith('http')) return bid.bidNtceUrl;
        return `https://www.g2b.go.kr/pb/cm/pmakg/bid/bidinf/retrieveBidPblanc.do?bidno=${bid.bidNtceNo}&bidseq=${bid.bidNtceOrd}`;
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-screen">
            <header className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 text-slate-900 dark:text-white">준공예정 관공서 및 수영장</h1>
                        <p className="text-slate-500 dark:text-slate-400 flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-violet-500"></span>
                            조달청 시설공사 실시간 연동 (수영장 및 체육센터 건립)
                        </p>
                    </div>
                    {lastUpdated && (
                        <div className="text-xs text-slate-400 dark:text-slate-500 text-right">
                            최근 업데이트: {format(lastUpdated, 'HH:mm:ss')}
                        </div>
                    )}
                </div>

                <div className="bg-white dark:bg-slate-800 p-4 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 flex flex-col md:flex-row items-center gap-4">
                    <div className="flex items-center gap-2 flex-1 w-full">
                        <Calendar className="w-5 h-5 text-slate-400 dark:text-slate-500" />
                        <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-900 px-3 py-2 rounded-lg flex-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-sm outline-none w-full cursor-pointer text-slate-900 dark:text-white dark:[color-scheme:dark]"
                            />
                            <span className="text-slate-400">~</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-sm outline-none w-full cursor-pointer text-slate-900 dark:text-white dark:[color-scheme:dark]"
                            />
                        </div>
                    </div>
                    <button
                        onClick={fetchBids}
                        disabled={loading}
                        className="w-full md:w-auto bg-violet-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-violet-700 transition-colors flex items-center justify-center gap-2 disabled:bg-slate-300 dark:disabled:bg-slate-700"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {loading ? (loadingProgress || '조회 중...') : '조회하기'}
                    </button>
                </div>
            </header>

            {error ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-red-100 dark:border-red-900/30 shadow-sm">
                    <div className="bg-red-50 dark:bg-red-900/20 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500 dark:text-red-400" />
                    </div>
                    <p className="font-bold text-lg text-slate-800 dark:text-white mb-2">데이터를 불러오지 못했습니다</p>
                    <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">{error}</p>
                    <button onClick={fetchBids} className="text-violet-600 dark:text-violet-400 hover:underline text-sm">다시 시도하기</button>
                </div>
            ) : loading ? (
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-slate-100 dark:border-slate-700 shadow-sm animate-pulse">
                            <div className="h-6 bg-slate-100 dark:bg-slate-700 rounded w-3/4 mb-4"></div>
                            <div className="h-4 bg-slate-100 dark:bg-slate-700 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : bids.length === 0 ? (
                <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-slate-200 dark:border-slate-700 border-dashed">
                    <div className="bg-slate-50 dark:bg-slate-900 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-slate-400 dark:text-slate-500" />
                    </div>
                    <p className="font-medium text-slate-600 dark:text-slate-300">검색된 공사 공고가 없습니다.</p>
                    <p className="text-sm text-slate-400 dark:text-slate-500 mt-1">최근 6개월 이내의 날짜로 다시 조회해보세요.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <div className="flex justify-end mb-2">
                        <label className="flex items-center gap-2 text-sm text-slate-500 dark:text-slate-400 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={showClosed}
                                onChange={(e) => setShowClosed(e.target.checked)}
                                className="rounded border-slate-300 dark:border-slate-600 text-violet-600 focus:ring-violet-500 bg-white dark:bg-slate-800"
                            />
                            마감된 건도 보기 (건설 진행중)
                        </label>
                    </div>

                    {bids
                        .filter(bid => {
                            if (showClosed) return true;
                            const dDay = getDDay(bid.bidClseDt);
                            return dDay.label !== '투찰마감';
                        })
                        .map((bid) => {
                            const dDay = getDDay(bid.bidClseDt);
                            const bidDate = parseDate(bid.bidNtceDt);
                            const closeDate = parseDate(bid.bidClseDt);
                            const isNew = isNewBid(bid.bidNtceDt);

                            return (
                                <div key={bid.bidNtceNo} className="group bg-white dark:bg-slate-800 p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 dark:border-slate-700 hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-md transition-all">
                                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                {isNew && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-500 text-white animate-pulse">
                                                        신규발주
                                                    </span>
                                                )}
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${dDay.color}`}>
                                                    {dDay.label}
                                                </span>
                                                <span className="px-2.5 py-1 rounded-md bg-slate-100 dark:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-medium">
                                                    {bid.bidMethdNm || '일반경쟁'}
                                                </span>
                                                <span className="text-xs text-slate-400 dark:text-slate-500 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(bidDate, 'yyyy.MM.dd', { locale: ko })} 공고
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-xl text-slate-900 dark:text-white mb-3 break-keep leading-snug group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors">
                                                {bid.bidNtceNm}
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-600 dark:text-slate-300 bg-slate-50 dark:bg-slate-900/50 p-4 rounded-xl border border-transparent dark:border-slate-800">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Building2 className="w-3.5 h-3.5" /> 수요기관</span>
                                                    <span className="font-medium truncate ml-2 text-slate-800 dark:text-slate-200">{bid.dminsttNm}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 투찰마감</span>
                                                    <span className="font-medium text-slate-800 dark:text-slate-200">
                                                        {format(closeDate, 'yyyy.MM.dd HH:mm', { locale: ko })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between md:col-span-2 pt-2 mt-2 border-t border-slate-200/60 dark:border-slate-700/60">
                                                    <span className="text-slate-400 dark:text-slate-500 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> 배정예산(추정가격)</span>
                                                    <span className="font-bold text-lg text-slate-900 dark:text-white">
                                                        {formatCurrency(bid.presmptPrce)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 md:mt-0 flex md:flex-col gap-2 shrink-0">
                                            <a
                                                href={getBidUrl(bid)}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400 hover:bg-violet-100 dark:hover:bg-violet-900/40 px-4 py-3 rounded-xl font-medium text-sm transition-colors border border-transparent dark:border-violet-800/30"
                                            >
                                                공고문 보기 <ExternalLink className="w-4 h-4" />
                                            </a>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                </div>
            )}
        </div>
    );
}
