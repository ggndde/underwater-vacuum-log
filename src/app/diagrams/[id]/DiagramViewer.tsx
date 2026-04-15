'use client'

import { useState, useRef, useCallback } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, Search, Package, X, CheckCircle2, AlertCircle } from 'lucide-react'

type Part = {
    id: number
    articleNo: string
    name: string
    category: string
    stock: number
    lowStockThreshold: number
}

type Hotspot = {
    id: number
    articleNo: string
    x: number      // % from left
    y: number      // % from top
    label: string | null
    part: Part | null
}

type Diagram = {
    id: number
    name: string
    drawingNo: string | null
    category: string
    hotspots: Hotspot[]
}

const CATEGORY_COLORS: Record<string, string> = {
    CP: 'bg-blue-500',
    PP: 'bg-purple-500',
    NV3: 'bg-teal-500',
    '공용': 'bg-slate-400',
}

const STOCK_COLOR = (part: Part | null) => {
    if (!part) return 'bg-slate-400'
    if (part.stock === 0) return 'bg-red-500'
    if (part.stock <= part.lowStockThreshold) return 'bg-amber-400'
    return 'bg-green-500'
}

// ── Tooltip ───────────────────────────────────────────────────────────────────
function HotspotTooltip({ hotspot, onClose }: { hotspot: Hotspot; onClose: () => void }) {
    const { articleNo, label, part } = hotspot
    return (
        <div className="pointer-events-auto absolute z-30 w-56 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl shadow-xl p-3 text-sm"
            style={{ minWidth: '200px' }}>
            <button onClick={onClose} className="absolute top-2 right-2 text-slate-300 hover:text-slate-500">
                <X className="w-3.5 h-3.5" />
            </button>

            {/* Article No */}
            <p className="font-mono font-bold text-blue-600 dark:text-blue-400 text-base">{articleNo}</p>

            {/* Part info from DB */}
            {part ? (
                <div className="mt-1.5 space-y-1">
                    <p className="font-semibold text-slate-800 dark:text-slate-100 leading-tight">{part.name}</p>
                    <div className="flex items-center gap-2 flex-wrap">
                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded text-white ${CATEGORY_COLORS[part.category] ?? 'bg-slate-400'}`}>
                            {part.category}
                        </span>
                        <span className={`flex items-center gap-1 text-xs font-semibold ${part.stock === 0 ? 'text-red-600' : part.stock <= part.lowStockThreshold ? 'text-amber-600' : 'text-green-600'}`}>
                            <Package className="w-3 h-3" />
                            재고 {part.stock}개
                            {part.stock === 0 && <span className="font-bold">(품절)</span>}
                            {part.stock > 0 && part.stock <= part.lowStockThreshold && <span>(부족)</span>}
                        </span>
                    </div>
                </div>
            ) : (
                <div className="mt-1.5">
                    {label && <p className="text-slate-600 dark:text-slate-300 leading-tight mb-1">{label}</p>}
                    <p className="text-xs text-slate-400 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" />재고 미등록 부품
                    </p>
                </div>
            )}

            {/* Detected label (if different from part name) */}
            {part && label && label !== part.name && (
                <p className="mt-1 text-xs text-slate-400 italic">{label}</p>
            )}
        </div>
    )
}

// ── Hotspot Dot ───────────────────────────────────────────────────────────────
function HotspotDot({
    hotspot, scale, selected, onSelect,
}: {
    hotspot: Hotspot
    scale: number
    selected: boolean
    onSelect: (h: Hotspot | null) => void
}) {
    const dotRef = useRef<HTMLDivElement>(null)
    const colorClass = STOCK_COLOR(hotspot.part)

    // Determine tooltip direction (flip if near edges)
    const tooltipStyle: React.CSSProperties = {}
    if (hotspot.x > 65) { tooltipStyle.right = '100%'; tooltipStyle.marginRight = '6px' }
    else { tooltipStyle.left = '100%'; tooltipStyle.marginLeft = '6px' }
    if (hotspot.y > 70) { tooltipStyle.bottom = '0' }
    else { tooltipStyle.top = '0' }

    return (
        <div
            ref={dotRef}
            style={{
                position: 'absolute',
                left: `${hotspot.x}%`,
                top: `${hotspot.y}%`,
                transform: 'translate(-50%, -50%)',
                zIndex: selected ? 20 : 10,
            }}
        >
            {/* Dot */}
            <button
                onClick={(e) => { e.stopPropagation(); onSelect(selected ? null : hotspot) }}
                className={`
                    relative flex items-center justify-center rounded-full border-2 border-white shadow-md
                    transition-all duration-150 hover:scale-150 focus:outline-none
                    ${colorClass}
                    ${selected ? 'scale-150 ring-2 ring-blue-400 ring-offset-1' : ''}
                `}
                style={{ width: `${Math.max(8, 10 / scale)}px`, height: `${Math.max(8, 10 / scale)}px` }}
                title={`Art. No. ${hotspot.articleNo}${hotspot.label ? ' — ' + hotspot.label : ''}`}
            >
                {/* Pulse ring for unregistered parts */}
                {!hotspot.part && (
                    <span className="absolute inset-0 rounded-full bg-slate-400 animate-ping opacity-40" />
                )}
            </button>

            {/* Tooltip (shown when selected/clicked) */}
            {selected && (
                <div style={{ position: 'absolute', ...tooltipStyle, pointerEvents: 'auto' }}>
                    <HotspotTooltip hotspot={hotspot} onClose={() => onSelect(null)} />
                </div>
            )}
        </div>
    )
}

// ── Viewer ────────────────────────────────────────────────────────────────────
export function DiagramViewer({ diagram }: { diagram: Diagram }) {
    const containerRef = useRef<HTMLDivElement>(null)
    const [scale, setScale] = useState(1)
    const [offset, setOffset] = useState({ x: 0, y: 0 })
    const [isDragging, setIsDragging] = useState(false)
    const [dragStart, setDragStart] = useState({ x: 0, y: 0, ox: 0, oy: 0 })
    const [selected, setSelected] = useState<Hotspot | null>(null)
    const [search, setSearch] = useState('')
    const [hoveredArticle, setHoveredArticle] = useState<string | null>(null)

    // ── Zoom ─────────────────────────────────────────────────────────────────
    const zoom = useCallback((factor: number) => {
        setScale(s => Math.min(8, Math.max(0.3, s * factor)))
    }, [])

    const reset = useCallback(() => { setScale(1); setOffset({ x: 0, y: 0 }); setSelected(null) }, [])

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        zoom(e.deltaY < 0 ? 1.1 : 0.9)
    }, [zoom])

    // ── Pan ──────────────────────────────────────────────────────────────────
    const handleMouseDown = (e: React.MouseEvent) => {
        if ((e.target as HTMLElement).closest('button[data-hotspot]')) return
        setIsDragging(true)
        setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y })
    }
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        setOffset({ x: dragStart.ox + (e.clientX - dragStart.x), y: dragStart.oy + (e.clientY - dragStart.y) })
    }
    const handleMouseUp = () => setIsDragging(false)

    // ── Search / filter ───────────────────────────────────────────────────────
    const searchTerm = search.trim().toLowerCase()
    const filtered = searchTerm
        ? diagram.hotspots.filter(h =>
            h.articleNo.includes(searchTerm) ||
            h.label?.toLowerCase().includes(searchTerm) ||
            h.part?.name.toLowerCase().includes(searchTerm))
        : diagram.hotspots

    const matchedArticles = new Set(filtered.map(h => h.articleNo))

    // Stats
    const total = diagram.hotspots.length
    const registered = diagram.hotspots.filter(h => h.part).length
    const outOfStock = diagram.hotspots.filter(h => h.part && h.part.stock === 0).length

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            {/* ── Toolbar ── */}
            <div className="flex items-center gap-3 px-4 py-2 bg-white border-b border-slate-200 flex-wrap">
                {/* Search */}
                <div className="relative flex-1 min-w-40 max-w-64">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
                    <input
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        placeholder="Art. No. 또는 부품명 검색"
                        className="w-full pl-8 pr-3 py-1.5 text-sm border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {search && (
                        <button onClick={() => setSearch('')} className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Stats */}
                <div className="flex items-center gap-3 text-xs text-slate-500">
                    <span><span className="font-bold text-slate-700">{total}</span> Art. No.</span>
                    <span className="text-green-600"><CheckCircle2 className="inline w-3 h-3 mr-0.5" /><span className="font-bold">{registered}</span> 등록</span>
                    {outOfStock > 0 && <span className="text-red-500 font-semibold">품절 {outOfStock}개</span>}
                </div>

                <div className="flex-1" />

                {/* Zoom controls */}
                <div className="flex items-center gap-1">
                    <button onClick={() => zoom(0.8)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs text-slate-500 w-10 text-center">{Math.round(scale * 100)}%</span>
                    <button onClick={() => zoom(1.25)} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><ZoomIn className="w-4 h-4" /></button>
                    <button onClick={reset} className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-600"><RotateCcw className="w-4 h-4" /></button>
                </div>
            </div>

            {/* ── Legend ── */}
            <div className="flex items-center gap-4 px-4 py-1.5 bg-slate-50 border-b border-slate-100 text-xs text-slate-500">
                <span className="font-semibold text-slate-400">범례</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-green-500 inline-block" /> 재고 충분</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-amber-400 inline-block" /> 재고 부족</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-red-500 inline-block" /> 품절</span>
                <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-slate-400 inline-block" /> 미등록</span>
                <span className="text-slate-300 ml-1">· 점을 클릭하면 상세 정보가 표시됩니다</span>
            </div>

            {/* ── Canvas ── */}
            <div
                ref={containerRef}
                className="flex-1 overflow-hidden relative bg-slate-100 select-none"
                style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                onWheel={handleWheel}
                onMouseDown={handleMouseDown}
                onMouseMove={handleMouseMove}
                onMouseUp={handleMouseUp}
                onMouseLeave={handleMouseUp}
                onClick={() => setSelected(null)}
            >
                <div
                    style={{
                        position: 'absolute',
                        left: '50%',
                        top: '50%',
                        transform: `translate(calc(-50% + ${offset.x}px), calc(-50% + ${offset.y}px)) scale(${scale})`,
                        transformOrigin: 'center center',
                        transition: isDragging ? 'none' : 'transform 0.05s ease-out',
                    }}
                >
                    {/* Diagram image */}
                    <div className="relative inline-block shadow-xl">
                        <img
                            src={`/api/diagrams/${diagram.id}/image`}
                            alt={diagram.name}
                            draggable={false}
                            className="block max-w-none"
                            style={{ maxWidth: '80vw', maxHeight: '70vh', width: 'auto', height: 'auto' }}
                        />

                        {/* Hotspot overlay */}
                        <div className="absolute inset-0" style={{ pointerEvents: 'none' }}>
                            {diagram.hotspots.map(h => {
                                const isFiltered = searchTerm && !matchedArticles.has(h.articleNo)
                                if (isFiltered) return null
                                return (
                                    <div key={h.id} style={{ pointerEvents: 'auto' }}>
                                        <HotspotDot
                                            hotspot={h}
                                            scale={scale}
                                            selected={selected?.id === h.id}
                                            onSelect={(hs) => { setSelected(hs) }}
                                        />
                                    </div>
                                )
                            })}
                        </div>
                    </div>
                </div>
            </div>

            {/* ── Part list panel (search results) ── */}
            {searchTerm && filtered.length > 0 && (
                <div className="border-t border-slate-200 bg-white max-h-36 overflow-y-auto">
                    <div className="px-4 py-2 flex flex-wrap gap-2">
                        {filtered.map(h => (
                            <button
                                key={h.id}
                                onClick={() => setSelected(h)}
                                className={`flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-lg border transition-colors ${selected?.id === h.id ? 'bg-blue-50 border-blue-400 text-blue-700' : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-blue-300'}`}
                            >
                                <span className={`w-2 h-2 rounded-full ${STOCK_COLOR(h.part)}`} />
                                <span className="font-mono font-bold">{h.articleNo}</span>
                                {h.part && <span className="text-slate-400">— {h.part.name}</span>}
                                {!h.part && h.label && <span className="text-slate-400">— {h.label}</span>}
                            </button>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
