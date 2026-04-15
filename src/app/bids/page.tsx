'use client';

export const dynamic = 'force-dynamic';

import { useState, useEffect } from 'react';
import { format, subDays, parse, differenceInDays } from 'date-fns';
import { ko } from 'date-fns/locale';
import { Search, ExternalLink, Calendar, RefreshCw, AlertCircle, Clock, DollarSign, FileText } from 'lucide-react';

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

export default function BidsPage() {
    const [bids, setBids] = useState<BidItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [startDate, setStartDate] = useState(format(subDays(new Date(), 30), 'yyyy-MM-dd'));
    const [endDate, setEndDate] = useState(format(new Date(), 'yyyy-MM-dd'));
    const [showClosed, setShowClosed] = useState(false); // Default: Hide closed bids

    const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

    useEffect(() => {
        fetchBids();
    }, []);

    const fetchBids = async () => {
        setLoading(true);
        setError(null);
        try {
            const formattedStart = startDate.replace(/-/g, '') + '0000';
            const formattedEnd = endDate.replace(/-/g, '') + '2359';

            const res = await fetch(`/api/bids?startDate=${formattedStart}&endDate=${formattedEnd}`);
            const data = await res.json();

            if (!res.ok) {
                throw new Error(data.error || 'API 요청 실패');
            }

            if (data.items) {
                setBids(data.items);
            } else {
                setBids([]);
            }
            setLastUpdated(new Date());
        } catch (error) {
            console.error("Failed to fetch bids", error);
            setError("데이터를 불러오는데 실패했습니다. (API 키 동기화 대기 중이거나 설정 오류)");
        } finally {
            setLoading(false);
        }
    };

    // Helper to parse "YYYY-MM-DD HH:mm:ss"
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

        if (diff < 0) return { label: '마감', color: 'bg-slate-200 text-slate-500' };
        if (diff === 0) return { label: 'D-Day', color: 'bg-red-100 text-red-600 font-bold' };
        if (diff <= 3) return { label: `D-${diff}`, color: 'bg-orange-100 text-orange-600 font-bold' };
        return { label: `D-${diff}`, color: 'bg-green-100 text-green-600' };
    };

    const isNewBid = (dateStr: string) => {
        const bidDate = parseDate(dateStr);
        const now = new Date();
        // Check if within 24 hours
        return (now.getTime() - bidDate.getTime()) < 24 * 60 * 60 * 1000;
    };

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 bg-slate-50 min-h-screen">
            <header className="mb-8">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
                    <div>
                        <h1 className="text-3xl font-bold mb-2 text-slate-900">입찰 공고 모니터링</h1>
                        <p className="text-slate-500 flex items-center gap-2">
                            <span className="inline-block w-2 h-2 rounded-full bg-green-500"></span>
                            조달청 나라장터 실시간 연동 (수영장 청소기)
                        </p>
                    </div>
                    {lastUpdated && (
                        <div className="text-xs text-slate-400 text-right">
                            최근 업데이트: {format(lastUpdated, 'HH:mm:ss')}
                        </div>
                    )}
                </div>

                <div className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200 flex flex-col md:flex-row items-center gap-4">
                    <div className="flex items-center gap-2 flex-1 w-full">
                        <Calendar className="w-5 h-5 text-slate-400" />
                        <div className="flex items-center gap-2 bg-slate-100 px-3 py-2 rounded-lg flex-1">
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) => setStartDate(e.target.value)}
                                className="bg-transparent text-sm outline-none w-full cursor-pointer"
                            />
                            <span className="text-slate-400">~</span>
                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) => setEndDate(e.target.value)}
                                className="bg-transparent text-sm outline-none w-full cursor-pointer"
                            />
                        </div>
                    </div>
                    <button
                        onClick={fetchBids}
                        disabled={loading}
                        className="w-full md:w-auto bg-blue-600 text-white px-6 py-2.5 rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors flex items-center justify-center gap-2 disabled:bg-slate-300"
                    >
                        {loading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                        {loading ? '조회 중...' : '조회하기'}
                    </button>
                </div>
            </header>

            {error ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-red-100 shadow-sm">
                    <div className="bg-red-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <AlertCircle className="w-8 h-8 text-red-500" />
                    </div>
                    <p className="font-bold text-lg text-slate-800 mb-2">데이터를 불러오지 못했습니다</p>
                    <p className="text-slate-500 mb-6 max-w-md mx-auto">{error}</p>
                    <button onClick={fetchBids} className="text-blue-600 hover:underline text-sm">다시 시도하기</button>
                </div>
            ) : loading ? ( // Show loading skeleton or spinner
                <div className="space-y-4">
                    {[1, 2, 3].map((i) => (
                        <div key={i} className="bg-white p-6 rounded-2xl border border-slate-100 shadow-sm animate-pulse">
                            <div className="h-6 bg-slate-100 rounded w-3/4 mb-4"></div>
                            <div className="h-4 bg-slate-100 rounded w-1/2"></div>
                        </div>
                    ))}
                </div>
            ) : bids.length === 0 ? (
                <div className="text-center py-20 bg-white rounded-3xl border border-slate-200 border-dashed">
                    <div className="bg-slate-50 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Search className="w-8 h-8 text-slate-400" />
                    </div>
                    <p className="font-medium text-slate-600">검색된 입찰 공고가 없습니다.</p>
                    <p className="text-sm text-slate-400 mt-1">날짜를 변경하여 다시 조회해보세요.</p>
                </div>
            ) : (
                <div className="grid gap-4">
                    <div className="flex justify-end mb-2">
                        <label className="flex items-center gap-2 text-sm text-slate-500 cursor-pointer select-none">
                            <input
                                type="checkbox"
                                checked={showClosed}
                                onChange={(e) => setShowClosed(e.target.checked)}
                                className="rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                            />
                            마감된 공고 보기
                        </label>
                    </div>

                    {bids
                        .filter(bid => {
                            if (showClosed) return true;
                            const dDay = getDDay(bid.bidClseDt);
                            // Hide if label is '마감' (which corresponds to diff < 0)
                            return dDay.label !== '마감';
                        })
                        .map((bid) => {
                            const dDay = getDDay(bid.bidClseDt);
                            const bidDate = parseDate(bid.bidNtceDt);
                            const closeDate = parseDate(bid.bidClseDt);
                            const isNew = isNewBid(bid.bidNtceDt);

                            return (
                                <div key={bid.bidNtceNo} className="group bg-white p-5 md:p-6 rounded-2xl shadow-sm border border-slate-200 hover:border-blue-400 hover:shadow-md transition-all">
                                    <div className="flex flex-col md:flex-row md:items-start gap-4">
                                        <div className="flex-1 min-w-0">
                                            <div className="flex flex-wrap items-center gap-2 mb-3">
                                                {isNew && (
                                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-red-500 text-white animate-pulse">
                                                        NEW
                                                    </span>
                                                )}
                                                <span className={`px-2.5 py-1 rounded-md text-xs font-bold ${dDay.color}`}>
                                                    {dDay.label}
                                                </span>
                                                <span className="px-2.5 py-1 rounded-md bg-slate-100 text-slate-600 text-xs font-medium">
                                                    {bid.bidMethdNm || '일반경쟁'}
                                                </span>
                                                <span className="text-xs text-slate-400 flex items-center gap-1">
                                                    <Calendar className="w-3 h-3" />
                                                    {format(bidDate, 'yyyy.MM.dd', { locale: ko })} 공고
                                                </span>
                                            </div>

                                            <h3 className="font-bold text-xl text-slate-900 mb-3 break-keep leading-snug group-hover:text-blue-600 transition-colors">
                                                {bid.bidNtceNm}
                                            </h3>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-8 gap-y-2 text-sm text-slate-600 bg-slate-50 p-4 rounded-xl">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 flex items-center gap-1.5"><FileText className="w-3.5 h-3.5" /> 수요기관</span>
                                                    <span className="font-medium truncate ml-2">{bid.dminsttNm}</span>
                                                </div>
                                                <div className="flex items-center justify-between">
                                                    <span className="text-slate-400 flex items-center gap-1.5"><Clock className="w-3.5 h-3.5" /> 마감일시</span>
                                                    <span className="font-medium text-slate-800">
                                                        {format(closeDate, 'yyyy.MM.dd HH:mm', { locale: ko })}
                                                    </span>
                                                </div>
                                                <div className="flex items-center justify-between md:col-span-2 pt-2 mt-2 border-t border-slate-200/60">
                                                    <span className="text-slate-400 flex items-center gap-1.5"><DollarSign className="w-3.5 h-3.5" /> 배정예산(추정가격)</span>
                                                    <span className="font-bold text-lg text-slate-900">
                                                        {formatCurrency(bid.presmptPrce)}
                                                    </span>
                                                </div>
                                            </div>
                                        </div>

                                        <div className="mt-4 md:mt-0 flex md:flex-col gap-2 shrink-0">
                                            <a
                                                href={bid.bidNtceUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="flex-1 md:flex-none flex items-center justify-center gap-2 bg-blue-50 text-blue-600 hover:bg-blue-100 px-4 py-3 rounded-xl font-medium text-sm transition-colors"
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
