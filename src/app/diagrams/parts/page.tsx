'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { Search, Package, BookOpen, ChevronRight, AlertCircle, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'

interface PartResult {
    id: number
    article: string
    description: string
}

interface DiagramResult {
    id: number
    name: string
    drawingNo: string | null
    category: string
    thumbnailData: string | null
    hotspots: { articleNo: string; label: string | null }[]
}

export default function PartsSearchPage() {
    const searchParams = useSearchParams()
    const initialQ = searchParams.get('q') ?? ''
    const [query, setQuery] = useState(initialQ)
    const [parts, setParts] = useState<PartResult[]>([])
    const [diagrams, setDiagrams] = useState<DiagramResult[]>([])
    const [loading, setLoading] = useState(false)
    const [searched, setSearched] = useState(false)
    const [seeding, setSeeding] = useState(false)
    const [seedMsg, setSeedMsg] = useState<string | null>(null)
    const [catalogReady, setCatalogReady] = useState<boolean | null>(null)
    const inputRef = useRef<HTMLInputElement>(null)
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

    // Check if catalog has been seeded
    useEffect(() => {
        fetch('/api/parts-catalog/search?q=100004')
            .then(r => r.json())
            .then(data => setCatalogReady(data.parts?.length > 0))
            .catch(() => setCatalogReady(false))
    }, [])

    // Auto-search if query came from URL param
    useEffect(() => {
        if (initialQ) doSearch(initialQ)
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    const doSearch = useCallback(async (q: string) => {
        if (!q.trim()) { setParts([]); setDiagrams([]); setSearched(false); return }
        setLoading(true)
        setSearched(true)
        try {
            const res = await fetch(`/api/parts-catalog/search?q=${encodeURIComponent(q.trim())}`)
            const data = await res.json()
            setParts(data.parts ?? [])
            setDiagrams(data.diagrams ?? [])
        } catch {
            setParts([]); setDiagrams([])
        } finally {
            setLoading(false)
        }
    }, [])

    const handleInput = (e: React.ChangeEvent<HTMLInputElement>) => {
        const val = e.target.value
        setQuery(val)
        if (debounceRef.current) clearTimeout(debounceRef.current)
        debounceRef.current = setTimeout(() => doSearch(val), 300)
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Enter') {
            if (debounceRef.current) clearTimeout(debounceRef.current)
            doSearch(query)
        }
    }

    const handleSeed = async () => {
        setSeeding(true)
        setSeedMsg(null)
        try {
            const res = await fetch('/api/parts-catalog/seed', { method: 'POST' })
            const data = await res.json()
            setSeedMsg(data.message)
            setCatalogReady(true)
        } catch {
            setSeedMsg('등록 실패')
        } finally {
            setSeeding(false)
        }
    }

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6 min-h-screen">
            <header className="mb-6">
                <div className="flex items-center gap-3 mb-1">
                    <Link href="/diagrams" className="text-sm text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors">
                        부품 도면
                    </Link>
                    <ChevronRight className="w-3.5 h-3.5 text-slate-300" />
                    <span className="text-sm text-slate-600 dark:text-slate-300 font-medium">부품 카탈로그 검색</span>
                </div>
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white">부품 카탈로그 검색</h1>
                <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">부품 번호 또는 부품명으로 검색하면 관련 도면을 함께 확인할 수 있습니다.</p>
            </header>

            {/* Catalog not seeded warning */}
            {catalogReady === false && (
                <div className="mb-4 p-4 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700 rounded-2xl flex items-start gap-3">
                    <AlertCircle className="w-5 h-5 text-amber-500 shrink-0 mt-0.5" />
                    <div className="flex-1">
                        <p className="text-sm font-medium text-amber-800 dark:text-amber-300">부품 카탈로그가 아직 등록되지 않았습니다.</p>
                        <p className="text-xs text-amber-600 dark:text-amber-400 mt-0.5">아래 버튼을 눌러 1,581개 부품을 데이터베이스에 등록하세요.</p>
                        <button
                            onClick={handleSeed}
                            disabled={seeding}
                            className="mt-2 px-4 py-1.5 bg-amber-500 hover:bg-amber-600 text-white rounded-lg text-sm font-medium disabled:opacity-50 flex items-center gap-2"
                        >
                            {seeding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                            {seeding ? '등록 중...' : '부품 카탈로그 등록하기'}
                        </button>
                        {seedMsg && <p className="text-xs text-amber-700 dark:text-amber-300 mt-1.5 font-medium">{seedMsg}</p>}
                    </div>
                </div>
            )}

            {/* Search box */}
            <div className="relative mb-6">
                <div className="absolute inset-y-0 left-4 flex items-center pointer-events-none">
                    {loading ? <Loader2 className="w-5 h-5 text-violet-400 animate-spin" /> : <Search className="w-5 h-5 text-slate-400" />}
                </div>
                <input
                    ref={inputRef}
                    type="text"
                    value={query}
                    onChange={handleInput}
                    onKeyDown={handleKeyDown}
                    placeholder="부품 번호 (예: 100004) 또는 부품명 (예: BRUSH)"
                    autoFocus
                    className="w-full pl-12 pr-4 py-3.5 rounded-2xl border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 text-slate-900 dark:text-white text-base shadow-sm focus:outline-none focus:ring-2 focus:ring-violet-500 focus:border-transparent placeholder:text-slate-400"
                />
            </div>

            {!searched && !loading && (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                    <Search className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm">부품 번호나 부품명을 입력하세요</p>
                    <p className="text-xs mt-1">총 1,581개 부품 수록</p>
                </div>
            )}

            {searched && !loading && parts.length === 0 && diagrams.length === 0 && (
                <div className="text-center py-16 text-slate-400 dark:text-slate-500">
                    <Package className="w-12 h-12 mx-auto mb-3 opacity-30" />
                    <p className="text-sm font-medium">검색 결과가 없습니다</p>
                    <p className="text-xs mt-1">다른 검색어를 시도해보세요</p>
                </div>
            )}

            {/* Parts list */}
            {parts.length > 0 && (
                <section className="mb-8">
                    <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <Package className="w-4 h-4" />
                        부품 목록 <span className="font-normal normal-case">({parts.length}건)</span>
                    </h2>
                    <div className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm">
                        {parts.map((part, i) => (
                            <div
                                key={part.id}
                                className={`flex items-center gap-4 px-5 py-3.5 hover:bg-violet-50 dark:hover:bg-violet-900/10 transition-colors cursor-pointer ${i < parts.length - 1 ? 'border-b border-slate-100 dark:border-slate-700/60' : ''}`}
                                onClick={() => { setQuery(part.article); doSearch(part.article) }}
                            >
                                <span className="font-mono text-sm font-bold text-violet-600 dark:text-violet-400 w-20 shrink-0">
                                    {part.article}
                                </span>
                                <span className="text-sm text-slate-700 dark:text-slate-200 flex-1 min-w-0 truncate">
                                    {part.description}
                                </span>
                            </div>
                        ))}
                        {parts.length === 50 && (
                            <div className="px-5 py-2.5 bg-slate-50 dark:bg-slate-900/50 text-xs text-slate-400 text-center">
                                최대 50건만 표시됩니다. 더 구체적인 검색어를 입력해 주세요.
                            </div>
                        )}
                    </div>
                </section>
            )}

            {/* Diagrams with matching parts */}
            {diagrams.length > 0 && (
                <section>
                    <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider mb-3 flex items-center gap-2">
                        <BookOpen className="w-4 h-4" />
                        관련 도면 <span className="font-normal normal-case">({diagrams.length}개)</span>
                    </h2>
                    <div className="grid gap-3 sm:grid-cols-2">
                        {diagrams.map(diagram => (
                            <Link
                                key={diagram.id}
                                href={`/diagrams/${diagram.id}`}
                                className="group bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden shadow-sm hover:border-violet-400 dark:hover:border-violet-500 hover:shadow-md transition-all flex"
                            >
                                {/* Thumbnail */}
                                <div className="w-24 h-24 shrink-0 bg-slate-100 dark:bg-slate-700 flex items-center justify-center overflow-hidden">
                                    {diagram.thumbnailData ? (
                                        <img src={diagram.thumbnailData} alt={diagram.name} className="w-full h-full object-cover" />
                                    ) : (
                                        <BookOpen className="w-8 h-8 text-slate-300 dark:text-slate-600" />
                                    )}
                                </div>

                                {/* Info */}
                                <div className="flex-1 min-w-0 p-3.5 flex flex-col justify-between">
                                    <div>
                                        <p className="text-xs text-slate-400 dark:text-slate-500 mb-0.5">{diagram.category}</p>
                                        <p className="font-semibold text-sm text-slate-900 dark:text-white group-hover:text-violet-600 dark:group-hover:text-violet-400 transition-colors line-clamp-2 leading-snug">
                                            {diagram.name}
                                        </p>
                                        {diagram.drawingNo && (
                                            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5 font-mono">{diagram.drawingNo}</p>
                                        )}
                                    </div>
                                    <div className="mt-1.5 flex flex-wrap gap-1">
                                        {diagram.hotspots.slice(0, 3).map((h, i) => (
                                            <span key={i} className="inline-flex items-center px-1.5 py-0.5 rounded bg-violet-100 dark:bg-violet-900/30 text-violet-600 dark:text-violet-400 text-[11px] font-mono font-medium">
                                                {h.articleNo}
                                            </span>
                                        ))}
                                        {diagram.hotspots.length > 3 && (
                                            <span className="text-[11px] text-slate-400">+{diagram.hotspots.length - 3}</span>
                                        )}
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                </section>
            )}
        </div>
    )
}
