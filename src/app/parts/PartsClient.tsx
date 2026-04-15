'use client'

import { useState, useTransition } from 'react'
import {
    adjustStock, batchAdjustStock, updatePart,
} from '@/app/actions'
import {
    Plus, Minus, Package, Clock, ArrowDownCircle, ArrowUpCircle,
    Truck, Pencil, AlertTriangle, User, ShoppingBag, SendHorizontal,
    CheckCircle2, X, Search,
} from 'lucide-react'

type StockTransaction = {
    id: number
    partId: number
    delta: number
    transactionType: string
    note: string | null
    performedBy: string
    createdAt: Date
}

type Part = {
    id: number
    articleNo: string
    name: string
    category: string
    stock: number
    lowStockThreshold: number
    transactions: StockTransaction[]
}

type ModalMode = 'in' | 'out' | null
type BatchMode = 'in' | 'out' | null
type OutType = '현장사용' | '택배발송' | '기타'

const fmt = new Intl.DateTimeFormat('ko', {
    month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hour12: false,
})
const formatDate = (d: Date | string) => fmt.format(typeof d === 'string' ? new Date(d) : d)

const CATEGORY_COLORS: Record<string, string> = {
    CP: 'bg-blue-100 text-blue-700',
    PP: 'bg-purple-100 text-purple-700',
    NV3: 'bg-teal-100 text-teal-700',
    '공용': 'bg-slate-100 text-slate-600',
}

export function PartsClient({
    parts,
    categories,
}: {
    parts: Part[]
    categories: readonly string[]
}) {
    const [activeTab, setActiveTab] = useState<string>('전체')

    // ── Single-part modal ───────────────────────────────────────────────────
    const [selected, setSelected] = useState<Part | null>(null)
    const [mode, setMode] = useState<ModalMode>(null)
    const [qty, setQty] = useState(1)
    const [outType, setOutType] = useState<OutType>('현장사용')
    const [note, setNote] = useState('')
    const [showHistory, setShowHistory] = useState<number | null>(null)
    const [isPending, startTransition] = useTransition()

    // ── Edit modal ──────────────────────────────────────────────────────────
    const [editTarget, setEditTarget] = useState<Part | null>(null)
    const [editArticleNo, setEditArticleNo] = useState('')
    const [editName, setEditName] = useState('')
    const [editCategory, setEditCategory] = useState('')
    const [editStock, setEditStock] = useState<number>(0)
    const [editThreshold, setEditThreshold] = useState<number>(2)
    const [isEditPending, startEditTransition] = useTransition()

    // ── Batch mode ──────────────────────────────────────────────────────────
    const [batchMode, setBatchMode] = useState<BatchMode>(null)
    const [batchQty, setBatchQty] = useState<Record<number, number>>({}) // partId → qty
    const [batchOutType, setBatchOutType] = useState<OutType>('현장사용')
    const [batchNote, setBatchNote] = useState('')
    const [searchQuery, setSearchQuery] = useState('')
    const [isBatchPending, startBatchTransition] = useTransition()

    // ── Derived ────────────────────────────────────────────────────────────
    const lowStockParts = parts.filter(p => p.stock <= p.lowStockThreshold)
    const tabs = ['전체', '⚠️ 재고 부족', ...categories]

    const filtered =
        activeTab === '전체' ? parts
            : activeTab === '⚠️ 재고 부족' ? lowStockParts
                : parts.filter(p => p.category === activeTab)

    const displayParts = searchQuery.trim()
        ? filtered.filter(p =>
            p.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
            p.articleNo.toLowerCase().includes(searchQuery.toLowerCase())
        )
        : filtered

    const batchSelected = Object.entries(batchQty).filter(([, v]) => v > 0)
    const batchItemCount = batchSelected.length

    // ── Single-part helpers ─────────────────────────────────────────────────
    const openModal = (part: Part, m: ModalMode) => {
        setSelected(part); setMode(m); setQty(1); setNote(''); setOutType('현장사용')
    }
    const closeModal = () => { setSelected(null); setMode(null) }

    const openEdit = (part: Part) => {
        setEditTarget(part)
        setEditArticleNo(part.articleNo)
        setEditName(part.name)
        setEditCategory(part.category)
        setEditStock(part.stock)
        setEditThreshold(part.lowStockThreshold)
    }
    const closeEdit = () => setEditTarget(null)

    const handleSubmit = () => {
        if (!selected || !mode) return
        const fd = new FormData()
        fd.append('partId', selected.id.toString())
        fd.append('delta', mode === 'in' ? qty.toString() : (-qty).toString())
        fd.append('transactionType', mode === 'in' ? '입고' : outType)
        fd.append('note', note)
        startTransition(async () => { await adjustStock(fd); closeModal() })
    }

    const handleEditSubmit = () => {
        if (!editTarget) return
        const fd = new FormData()
        fd.append('partId', editTarget.id.toString())
        fd.append('articleNo', editArticleNo)
        fd.append('name', editName)
        fd.append('category', editCategory)
        fd.append('stock', editStock.toString())
        fd.append('lowStockThreshold', editThreshold.toString())
        startEditTransition(async () => { await updatePart(fd); closeEdit() })
    }

    const canSubmit = !(mode === 'out' && outType === '현장사용' && !note.trim())

    // ── Batch helpers ─────────────────────────────────────────────────────
    const enterBatch = (m: 'in' | 'out') => {
        setBatchMode(m)
        setBatchQty({})
        setBatchNote('')
        setBatchOutType('현장사용')
        setSearchQuery('')
        setShowHistory(null)
    }

    const exitBatch = () => {
        setBatchMode(null)
        setBatchQty({})
        setSearchQuery('')
    }

    const setBatchPartQty = (partId: number, delta: number, maxQty?: number) => {
        setBatchQty(prev => {
            const cur = prev[partId] ?? 0
            const next = Math.max(0, cur + delta)
            const capped = maxQty !== undefined ? Math.min(next, maxQty) : next
            const updated = { ...prev, [partId]: capped }
            if (updated[partId] === 0) delete updated[partId]
            return updated
        })
    }

    const handleBatchSubmit = () => {
        if (!batchMode || batchItemCount === 0) return
        const partMap = new Map(parts.map(p => [p.id, p]))

        const items = Object.entries(batchQty)
            .filter(([, v]) => v > 0)
            .map(([id, v]) => ({
                partId: parseInt(id),
                delta: batchMode === 'in' ? v : -v,
                transactionType: batchMode === 'in' ? '입고' : batchOutType,
                note: batchNote,
            }))

        const fd = new FormData()
        fd.append('items', JSON.stringify(items))

        startBatchTransition(async () => {
            await batchAdjustStock(fd)
            exitBatch()
        })

        // Optimistic: show details
        console.log('Batch submit:', items.map(i => {
            const p = partMap.get(i.partId)
            return `${p?.name} ${i.delta > 0 ? '+' : ''}${i.delta}`
        }))
    }

    const batchCanSubmit = batchItemCount > 0 &&
        !(batchMode === 'out' && batchOutType === '현장사용' && !batchNote.trim())

    // ── Render ────────────────────────────────────────────────────────────
    return (
        <>
            {/* ── Batch Mode Sticky Banner ────────────────────────────────── */}
            {batchMode && (
                <div className={`sticky top-[58px] sm:top-[64px] z-40 rounded-2xl shadow-lg mt-4 mb-5 p-4 transition-all ${batchMode === 'in'
                    ? 'bg-green-600 text-white'
                    : 'bg-orange-500 text-white'
                    }`}>
                    {/* Header row */}
                    <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center gap-2">
                            {batchMode === 'in'
                                ? <ArrowDownCircle className="w-5 h-5" />
                                : <ArrowUpCircle className="w-5 h-5" />}
                            <span className="font-bold text-base">
                                일괄 {batchMode === 'in' ? '입고' : '출고'} 모드
                            </span>
                            {batchItemCount > 0 && (
                                <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${batchMode === 'in' ? 'bg-green-700' : 'bg-orange-600'
                                    }`}>
                                    {batchItemCount}개 부품 선택됨
                                </span>
                            )}
                        </div>
                        <button
                            onClick={exitBatch}
                            className="w-8 h-8 flex items-center justify-center rounded-full bg-white/20 hover:bg-white/30 transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    </div>

                    {/* Out type selector (출고 only) */}
                    {batchMode === 'out' && (
                        <div className="flex gap-2 mb-3">
                            {(['현장사용', '택배발송', '기타'] as OutType[]).map(t => (
                                <button
                                    key={t}
                                    onClick={() => setBatchOutType(t)}
                                    className={`flex-1 py-1.5 rounded-xl text-sm font-semibold border-2 transition-colors ${batchOutType === t
                                        ? 'bg-white text-orange-600 border-white'
                                        : 'bg-transparent text-white border-white/50 hover:border-white'
                                        }`}
                                >
                                    {t === '택배발송' ? <><Truck className="w-3.5 h-3.5 inline mr-1" />{t}</> : t}
                                </button>
                            ))}
                        </div>
                    )}

                    {/* Note input */}
                    <div className="flex gap-2">
                        <input
                            type="text"
                            value={batchNote}
                            onChange={e => setBatchNote(e.target.value)}
                            placeholder={
                                batchMode === 'in' ? '메모 (예: 본사 입고)'
                                    : batchOutType === '현장사용' ? '업체명 * (예: 대전길치문화체육센터)'
                                        : '메모 (예: 부산 한국수영장서비스)'
                            }
                            className={`flex-1 px-4 py-2 rounded-xl text-sm outline-none bg-white/20 placeholder-white/60 text-white ${batchMode === 'out' && batchOutType === '현장사용' && !batchNote.trim()
                                ? 'border-2 border-white/50'
                                : 'border-2 border-transparent'
                                }`}
                        />
                        <button
                            onClick={handleBatchSubmit}
                            disabled={!batchCanSubmit || isBatchPending}
                            className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-white font-bold text-sm transition-all disabled:opacity-40 disabled:cursor-not-allowed shrink-0"
                            style={{ color: batchMode === 'in' ? '#16a34a' : '#ea580c' }}
                        >
                            {isBatchPending
                                ? '처리 중...'
                                : <><CheckCircle2 className="w-4 h-4" /> 확정 ({batchItemCount})</>}
                        </button>
                    </div>

                    {/* Search input inside Sticky Banner */}
                    <div className="relative mt-3">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/60 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="부품명 또는 품번으로 검색..."
                            className="w-full pl-9 pr-4 py-2 rounded-xl bg-white/20 border-2 border-transparent text-white placeholder-white/50 text-sm outline-none focus:border-white/60"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-3 top-1/2 -translate-y-1/2 text-white/60 hover:text-white"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        )}
                    </div>

                    {/* Selected parts summary */}
                    {batchItemCount > 0 && (
                        <div className="mt-3 flex flex-wrap gap-1.5">
                            {batchSelected.map(([id, v]) => {
                                const part = parts.find(p => p.id === parseInt(id))
                                if (!part) return null
                                return (
                                    <span key={id} className="flex items-center gap-1 bg-white/20 rounded-full px-2 py-0.5 text-xs font-medium">
                                        {part.name}
                                        <span className="font-bold ml-0.5">×{v}</span>
                                        <button
                                            onClick={() => setBatchQty(prev => { const n = { ...prev }; delete n[parseInt(id)]; return n })}
                                            className="hover:bg-white/30 rounded-full p-0.5"
                                        >
                                            <X className="w-2.5 h-2.5" />
                                        </button>
                                    </span>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            {/* ── Sticky Toolbar (Search & Tabs) ── */}
            {!batchMode && (
                <div className="sticky top-[58px] sm:top-[64px] z-30 pt-4 pb-3 sm:pb-4 mb-4 sm:mb-5 -mx-4 px-4 sm:-mx-6 sm:px-6 bg-slate-50/80 dark:bg-slate-950/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-800/50 transition-all">
                    {/* ── Global Search Bar ── */}
                    <div className="relative mb-3 sm:mb-4">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400 pointer-events-none" />
                        <input
                            type="text"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Article No. (품번) 또는 부품명 검색..."
                            className="w-full pl-11 pr-10 py-2.5 sm:py-3 rounded-2xl border border-slate-200/80 dark:border-slate-700/80 text-slate-900 dark:text-white bg-white/70 dark:bg-slate-900/70 placeholder-slate-400 text-sm sm:text-base font-bold outline-none focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 transition-all shadow-sm"
                        />
                        {searchQuery && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-4 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full p-1 transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* ── Category / Filter Tabs + Batch Buttons ── */}
                    <div className="flex flex-wrap gap-2">
                        <div className="flex gap-2 overflow-x-auto pb-1 flex-1 hide-scrollbar">
                            {tabs.map(tab => {
                                const isWarning = tab === '⚠️ 재고 부족'
                                const count =
                                    tab === '전체' ? parts.length
                                        : tab === '⚠️ 재고 부족' ? lowStockParts.length
                                            : parts.filter(p => p.category === tab).length
                                const isActive = activeTab === tab
                                return (
                                    <button
                                        key={tab}
                                        onClick={() => setActiveTab(tab)}
                                        className={`px-4 sm:px-5 py-2 rounded-full text-[13px] sm:text-sm font-bold whitespace-nowrap transition-colors shadow-sm ${isActive
                                            ? isWarning ? 'bg-red-500 text-white border border-red-500' : 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border border-slate-900 dark:border-white'
                                            : isWarning && count > 0
                                                ? 'bg-red-50 dark:bg-red-500/10 text-red-600 dark:text-red-400 border border-red-200 dark:border-red-500/30 hover:bg-red-100 dark:hover:bg-red-500/20'
                                                : 'bg-white dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600'
                                            }`}
                                    >
                                        {tab}
                                        <span className="ml-1.5 opacity-70">{count}</span>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Batch trigger buttons */}
                        <div className="flex gap-2 shrink-0">
                            <button
                                onClick={() => enterBatch('in')}
                                className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-green-600 text-white text-[13px] sm:text-sm font-bold hover:bg-green-700 transition-colors shadow-sm whitespace-nowrap"
                            >
                                <ShoppingBag className="w-4 h-4 sm:w-4 sm:h-4" />
                                일괄 입고
                            </button>
                            <button
                                onClick={() => enterBatch('out')}
                                className="flex items-center gap-1.5 px-4 sm:px-5 py-2 rounded-full bg-orange-500 text-white text-[13px] sm:text-sm font-bold hover:bg-orange-600 transition-colors shadow-sm whitespace-nowrap"
                            >
                                <SendHorizontal className="w-4 h-4 sm:w-4 sm:h-4" />
                                일괄 출고
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Parts List ─────────────────────────────────────────────── */}
            <div className="flex flex-col gap-3">

                {displayParts.map((part) => {
                    const isLow = part.stock <= part.lowStockThreshold
                    const isShowingHistory = showHistory === part.id
                    const catColor = CATEGORY_COLORS[part.category] ?? 'bg-slate-100 text-slate-600'
                    const bQty = batchQty[part.id] ?? 0
                    const isBatchSelected = bQty > 0
                    const maxBatchOut = part.stock // can't go negative

                    return (
                        <div
                            key={part.id}
                            className={`bg-white rounded-xl shadow-sm border transition-all ${batchMode && isBatchSelected
                                ? batchMode === 'in'
                                    ? 'border-green-400 ring-1 ring-green-200'
                                    : 'border-orange-400 ring-1 ring-orange-200'
                                : isLow ? 'border-red-300' : 'border-slate-200'
                                }`}
                        >
                            <div className="p-3 sm:p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 sm:gap-4">
                                
                                {/* ── Left Info ── */}
                                <div className="min-w-0 flex-1 flex flex-col justify-center">
                                    <div className="flex items-center gap-2 mb-1">
                                        <span className={`text-[10px] sm:text-xs font-bold px-2 py-0.5 rounded-md ${catColor}`}>
                                            {part.category}
                                        </span>
                                        <p className="text-xs sm:text-sm font-mono text-slate-400">{part.articleNo}</p>
                                        {isLow && !batchMode && (
                                            <span className="flex items-center gap-0.5 text-[10px] sm:text-xs text-red-500 font-bold bg-red-50 px-1.5 py-0.5 rounded-md ml-1 sm:ml-2">
                                                <AlertTriangle className="w-3 h-3 sm:w-3.5 sm:h-3.5" /> 부족
                                            </span>
                                        )}
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <h3 className="font-bold text-base sm:text-lg text-slate-900 leading-tight truncate">{part.name}</h3>
                                        {!batchMode && (
                                            <button
                                                onClick={() => openEdit(part)}
                                                className="text-slate-300 hover:text-slate-600 transition-colors shrink-0 p-1"
                                                title="수정"
                                            >
                                                <Pencil className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
                                            </button>
                                        )}
                                    </div>
                                </div>

                                {/* ── Middle/Right Actions Container ── */}
                                <div className="flex items-center justify-between sm:justify-end gap-3 sm:gap-5 w-full sm:w-auto shrink-0">
                                    
                                    {/* Stock Display Box */}
                                    <div className={`shrink-0 flex flex-col items-center justify-center min-w-[70px] rounded-lg px-3 py-1.5 sm:py-2 border ${batchMode && isBatchSelected
                                        ? batchMode === 'in' ? 'bg-green-50 border-green-100' : 'bg-orange-50 border-orange-100'
                                        : isLow ? 'bg-red-50 border-red-100' : 'bg-slate-50 border-slate-100'
                                        }`}>
                                        <span className="text-[10px] sm:text-[11px] font-semibold text-slate-400 leading-none mb-1">재고수량</span>
                                        <span className={`text-xl sm:text-2xl font-black leading-none ${batchMode && isBatchSelected
                                            ? batchMode === 'in' ? 'text-green-600' : 'text-orange-600'
                                            : isLow ? 'text-red-600' : 'text-slate-700'
                                            }`}>
                                            {part.stock}
                                        </span>
                                    </div>

                                    {/* Action Buttons */}
                                    <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
                                        {Math.random() >= 0 /* Always true to allow rendering stepper logic correctly below */ && batchMode ? (
                                            <div className="flex items-center gap-1.5">
                                                <button
                                                    onClick={() => setBatchPartQty(part.id, -1)}
                                                    disabled={bQty === 0}
                                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors disabled:opacity-30"
                                                >
                                                    <Minus className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </button>
                                                <span className={`text-xl sm:text-2xl font-black w-8 sm:w-10 text-center ${bQty > 0
                                                    ? batchMode === 'in' ? 'text-green-600' : 'text-orange-600'
                                                    : 'text-slate-300'
                                                    }`}>
                                                    {bQty}
                                                </span>
                                                <button
                                                    onClick={() => setBatchPartQty(
                                                        part.id,
                                                        +1,
                                                        batchMode === 'out' ? maxBatchOut : undefined
                                                    )}
                                                    disabled={batchMode === 'out' && bQty >= maxBatchOut}
                                                    className="w-8 h-8 sm:w-9 sm:h-9 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors disabled:opacity-30"
                                                >
                                                    <Plus className="w-4 h-4 sm:w-5 sm:h-5" />
                                                </button>
                                            </div>
                                        ) : (
                                            <div className="flex gap-1.5 sm:gap-2 h-9 sm:h-10">
                                                <button
                                                    onClick={() => openModal(part, 'in')}
                                                    className="flex items-center justify-center gap-1 bg-green-50 text-green-700 hover:bg-green-100 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors"
                                                >
                                                    <ArrowDownCircle className="w-4 h-4 shrink-0" />
                                                    <span className="hidden sm:inline-block">입고</span>
                                                </button>
                                                <button
                                                    onClick={() => openModal(part, 'out')}
                                                    disabled={part.stock === 0}
                                                    className="flex items-center justify-center gap-1 bg-orange-50 text-orange-700 hover:bg-orange-100 px-3 sm:px-4 rounded-xl text-xs sm:text-sm font-bold transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                                >
                                                    <ArrowUpCircle className="w-4 h-4 shrink-0" />
                                                    <span className="hidden sm:inline-block">출고</span>
                                                </button>
                                                <button
                                                    onClick={() => setShowHistory(isShowingHistory ? null : part.id)}
                                                    className={`flex items-center justify-center px-2.5 sm:px-3 rounded-xl transition-colors ${
                                                        isShowingHistory ? 'bg-slate-700 text-white' : 'bg-slate-100 hover:bg-slate-200 text-slate-500'
                                                    }`}
                                                    title="이력 보기"
                                                >
                                                    <Clock className="w-4 h-4 shrink-0" />
                                                </button>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>

                            {/* Transaction History */}
                            {isShowingHistory && !batchMode && (
                                <div className="border-t border-slate-100 p-4 sm:p-5 max-h-72 overflow-y-auto">
                                    <p className="text-sm font-bold text-slate-400 uppercase mb-3">입출고 이력</p>
                                    {part.transactions.length === 0 ? (
                                        <p className="text-base text-slate-400 text-center py-3">이력 없음</p>
                                    ) : (
                                        <div className="space-y-3">
                                            {[...part.transactions].reverse().map((tx) => (
                                                <div key={tx.id} className="flex items-start justify-between text-base gap-2">
                                                    <div className="flex items-start gap-2 min-w-0">
                                                        {tx.delta > 0
                                                            ? <ArrowDownCircle className="w-4 h-4 text-green-500 shrink-0 mt-0.5" />
                                                            : <ArrowUpCircle className="w-4 h-4 text-orange-500 shrink-0 mt-0.5" />}
                                                        <div className="min-w-0">
                                                            <div className="flex items-center gap-1.5 flex-wrap">
                                                                <span className="font-medium text-slate-700">{tx.transactionType}</span>
                                                                {tx.performedBy && (
                                                                    <span className="flex items-center gap-0.5 text-xs text-blue-600 bg-blue-50 px-1.5 py-0.5 rounded-full font-medium">
                                                                        <User className="w-3 h-3" />{tx.performedBy}
                                                                    </span>
                                                                )}
                                                                <span className="text-xs text-slate-400 tabular-nums">
                                                                    {formatDate(tx.createdAt)}
                                                                </span>
                                                            </div>
                                                            {tx.note && <p className="text-slate-400 text-sm mt-0.5 truncate">{tx.note}</p>}
                                                        </div>
                                                    </div>
                                                    <span className={`font-bold shrink-0 ${tx.delta > 0 ? 'text-green-600' : 'text-orange-600'}`}>
                                                        {tx.delta > 0 ? '+' : ''}{tx.delta}
                                                    </span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )
                })}
                {displayParts.length === 0 && (
                    <div className="col-span-2 text-center py-16 border border-dashed border-slate-300 rounded-2xl text-slate-400">
                        <Package className="w-10 h-10 mx-auto mb-3 opacity-40" />
                        <p>
                            {searchQuery.trim()
                                ? `'${searchQuery}'에 해당하는 부품이 없습니다.`
                                : activeTab === '전체' ? '등록된 부품이 없습니다.'
                                    : activeTab === '⚠️ 재고 부족' ? '재고 부족 부품이 없습니다. 👍'
                                        : `${activeTab} 분류의 부품이 없습니다.`}
                        </p>
                    </div>
                )}
            </div>

            {/* ── Single-part Stock Adjustment Modal ─────────────────────── */}
            {selected && mode && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7">
                        <h2 className="text-xl font-bold mb-1 text-slate-900">
                            {mode === 'in' ? '입고 처리' : '출고 처리'}
                        </h2>
                        <div className="flex items-center gap-2 mb-5">
                            <span className={`text-xs font-bold px-2.5 py-0.5 rounded-full ${CATEGORY_COLORS[selected.category] ?? ''}`}>
                                {selected.category}
                            </span>
                            <p className="text-base text-slate-500">{selected.name}</p>
                        </div>

                        {/* Qty */}
                        <div className="mb-5">
                            <label className="text-base font-semibold text-slate-600 block mb-2">수량</label>
                            <div className="flex items-center gap-3">
                                <button onClick={() => setQty(Math.max(1, qty - 1))} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                                    <Minus className="w-5 h-5" />
                                </button>
                                <span className="text-3xl font-black text-slate-900 w-14 text-center">{qty}</span>
                                <button onClick={() => setQty(mode === 'out' ? Math.min(selected.stock, qty + 1) : qty + 1)} className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors">
                                    <Plus className="w-5 h-5" />
                                </button>
                            </div>
                        </div>

                        {mode === 'out' && (
                            <div className="mb-5">
                                <label className="text-base font-semibold text-slate-600 block mb-2">출고 유형</label>
                                <div className="grid grid-cols-3 gap-2">
                                    {(['현장사용', '택배발송', '기타'] as const).map((t) => (
                                        <button
                                            key={t}
                                            onClick={() => setOutType(t)}
                                            className={`py-2.5 rounded-xl text-base font-semibold border-2 transition-colors ${outType === t ? 'border-orange-400 bg-orange-50 text-orange-700' : 'border-slate-200 text-slate-500 hover:border-slate-300'}`}
                                        >
                                            {t === '택배발송' ? <><Truck className="w-4 h-4 inline mr-1" />{t}</> : t}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        )}

                        <div className="mb-6">
                            <label className="text-base font-semibold text-slate-600 block mb-2">
                                {mode === 'in' ? '메모 (선택)' : outType === '현장사용' ? '업체명 *' : '메모 (선택)'}
                            </label>
                            <input
                                type="text"
                                value={note}
                                onChange={(e) => setNote(e.target.value)}
                                placeholder={
                                    mode === 'in' ? '예: 제조사 입고'
                                        : outType === '현장사용' ? '예: 대전길치문화체육센터'
                                            : outType === '택배발송' ? '예: 부산 한국수영장서비스'
                                                : '메모'
                                }
                                className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>

                        <div className="flex gap-3">
                            <button onClick={closeModal} className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 text-base font-semibold hover:bg-slate-200 transition-colors">
                                취소
                            </button>
                            <button
                                onClick={handleSubmit}
                                disabled={isPending || !canSubmit}
                                className={`flex-1 py-3.5 rounded-xl text-white text-base font-bold transition-colors disabled:opacity-50 ${mode === 'in' ? 'bg-green-600 hover:bg-green-700' : 'bg-orange-500 hover:bg-orange-600'}`}
                            >
                                {isPending ? '처리 중...' : mode === 'in' ? '입고 확정' : '출고 확정'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* ── Edit Modal ──────────────────────────────────────────────── */}
            {editTarget && (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-sm p-7 max-h-[90vh] overflow-y-auto">
                        <h2 className="text-xl font-bold mb-5 text-slate-900 flex items-center gap-2">
                            <Pencil className="w-5 h-5 text-blue-600" /> 부품 정보 수정
                        </h2>

                        <div className="space-y-4 mb-6">
                            <div>
                                <label className="text-sm font-semibold text-slate-500 uppercase block mb-1">Article No.</label>
                                <input
                                    type="text"
                                    value={editArticleNo}
                                    onChange={(e) => setEditArticleNo(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-500 uppercase block mb-1">부품명</label>
                                <input
                                    type="text"
                                    value={editName}
                                    onChange={(e) => setEditName(e.target.value)}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-500 uppercase block mb-1">모델 분류</label>
                                <div className="grid grid-cols-4 gap-2">
                                    {(['CP', 'PP', 'NV3', '공용'] as const).map(cat => (
                                        <button
                                            key={cat}
                                            onClick={() => setEditCategory(cat)}
                                            className={`py-2.5 rounded-xl text-base font-bold border-2 transition-colors ${editCategory === cat
                                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                                                }`}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-500 uppercase block mb-1">재고 수량 직접 수정</label>
                                <input
                                    type="number"
                                    min="0"
                                    value={editStock}
                                    onChange={(e) => setEditStock(Math.max(0, parseInt(e.target.value) || 0))}
                                    className="w-full border border-slate-200 rounded-xl px-4 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                                />
                            </div>
                            <div>
                                <label className="text-sm font-semibold text-slate-500 uppercase block mb-1">
                                    재고 부족 알림 기준 수량
                                </label>
                                <div className="flex items-center gap-3">
                                    <button
                                        onClick={() => setEditThreshold(Math.max(0, editThreshold - 1))}
                                        className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
                                    >
                                        <Minus className="w-5 h-5" />
                                    </button>
                                    <div className="flex-1 text-center">
                                        <span className="text-2xl font-black text-slate-900">{editThreshold}</span>
                                        <span className="text-base text-slate-400 ml-1">개 이하 시 알림</span>
                                    </div>
                                    <button
                                        onClick={() => setEditThreshold(editThreshold + 1)}
                                        className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center hover:bg-slate-200 transition-colors shrink-0"
                                    >
                                        <Plus className="w-5 h-5" />
                                    </button>
                                </div>
                            </div>
                        </div>

                        <div className="flex gap-3">
                            <button onClick={closeEdit} className="flex-1 py-3.5 rounded-xl bg-slate-100 text-slate-600 text-base font-semibold hover:bg-slate-200 transition-colors">
                                취소
                            </button>
                            <button
                                onClick={handleEditSubmit}
                                disabled={isEditPending || !editName.trim() || !editArticleNo.trim()}
                                className="flex-1 py-3.5 rounded-xl bg-blue-600 text-white text-base font-bold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                                {isEditPending ? '저장 중...' : '저장'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
