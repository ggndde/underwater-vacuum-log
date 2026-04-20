'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Loader2, Tag, X, Plus, Search, Sparkles } from 'lucide-react'
import Link from 'next/link'

type Diagram = {
    id: number
    name: string
    drawingNo: string | null
    category: string
}

type Hotspot = {
    id: number
    articleNo: string
    label: string | null
    description: string | null
}

// ── Parts Panel ───────────────────────────────────────────────────────────────
function PartsPanel({ diagramId }: { diagramId: number }) {
    const [hotspots, setHotspots] = useState<Hotspot[]>([])
    const [filter, setFilter] = useState('')
    const [input, setInput] = useState('')
    const [adding, setAdding] = useState(false)
    const [detecting, setDetecting] = useState(false)
    const [detectResult, setDetectResult] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showInput, setShowInput] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)
    const filterRef = useRef<HTMLInputElement>(null)

    const filtered = filter.trim()
        ? hotspots.filter(h =>
            h.articleNo.includes(filter.trim()) ||
            (h.description ?? h.label ?? '').toLowerCase().includes(filter.trim().toLowerCase())
        )
        : hotspots

    useEffect(() => {
        fetch(`/api/diagrams/${diagramId}/hotspots`)
            .then(r => r.json())
            .then(d => setHotspots(d.hotspots ?? []))
            .catch(() => {})
    }, [diagramId])

    useEffect(() => {
        if (showInput) inputRef.current?.focus()
    }, [showInput])

    const handleAdd = async () => {
        const article = input.trim()
        if (!article) return
        setAdding(true)
        setError(null)
        try {
            const res = await fetch(`/api/diagrams/${diagramId}/hotspots`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ articleNo: article }),
            })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? '오류'); return }
            setHotspots(prev => [...prev, data.hotspot])
            setInput('')
            setShowInput(false)
        } catch {
            setError('네트워크 오류')
        } finally {
            setAdding(false)
        }
    }

    const handleDelete = async (id: number) => {
        try {
            await fetch(`/api/diagrams/${diagramId}/hotspots/${id}`, { method: 'DELETE' })
            setHotspots(prev => prev.filter(h => h.id !== id))
        } catch {}
    }

    const handleAutoDetect = async () => {
        setDetecting(true)
        setDetectResult(null)
        setError(null)
        try {
            const res = await fetch(`/api/diagrams/${diagramId}/hotspots/auto-detect`, { method: 'POST' })
            const data = await res.json()
            if (!res.ok) { setError(data.error ?? '오류'); return }
            if (data.hotspots) setHotspots(data.hotspots)
            if (data.added === 0) {
                setDetectResult('새로 추가된 번호 없음 (이미 모두 등록됨)')
            } else {
                setDetectResult(`${data.added}개 번호 자동 등록 완료 (중복 ${data.skipped}개 제외)`)
            }
        } catch {
            setError('네트워크 오류')
        } finally {
            setDetecting(false)
        }
    }

    return (
        <div className="flex flex-col h-full bg-white border-r border-slate-200 w-64 shrink-0">
            {/* Header */}
            <div className="flex items-center justify-between px-3 py-2.5 border-b border-slate-200 bg-slate-50">
                <span className="text-xs font-semibold text-slate-600 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5 text-violet-500" />
                    부품 번호
                    {hotspots.length > 0 && (
                        <span className="bg-violet-100 text-violet-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{hotspots.length}</span>
                    )}
                </span>
            </div>

            {/* Search filter */}
            <div className="px-2 py-2 border-b border-slate-100">
                <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-slate-400 pointer-events-none" />
                    <input
                        ref={filterRef}
                        type="text"
                        value={filter}
                        onChange={e => setFilter(e.target.value)}
                        placeholder="번호 또는 부품명 검색"
                        className="w-full pl-6 pr-6 py-1.5 text-xs rounded-md border border-slate-200 bg-slate-50 outline-none focus:ring-2 focus:ring-violet-400 focus:bg-white"
                    />
                    {filter && (
                        <button onClick={() => setFilter('')} className="absolute right-1.5 top-1/2 -translate-y-1/2 text-slate-300 hover:text-slate-500">
                            <X className="w-3 h-3" />
                        </button>
                    )}
                </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-1 px-2 py-2 border-b border-slate-100">
                <button
                    onClick={handleAutoDetect}
                    disabled={detecting}
                    className="flex-1 flex items-center justify-center gap-1 py-1.5 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-600 hover:bg-amber-100 disabled:opacity-50 transition-colors"
                    title="AI로 도면에서 6자리 부품 번호를 자동 감지"
                >
                    {detecting ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                    {detecting ? '감지 중...' : 'AI 자동 감지'}
                </button>
                <button
                    onClick={() => { setShowInput(v => !v); setError(null) }}
                    className={`flex items-center justify-center gap-1 px-2.5 py-1.5 rounded-lg text-[11px] font-semibold transition-colors ${showInput ? 'bg-violet-100 text-violet-700' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
                >
                    <Plus className="w-3 h-3" />
                    추가
                </button>
            </div>

            {/* Result / error message */}
            {(detectResult || (error && !showInput)) && (
                <div className={`px-3 py-1.5 text-[11px] border-b border-slate-100 ${detectResult ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                    {detectResult ?? error}
                </div>
            )}

            {/* Manual input */}
            {showInput && (
                <div className="px-2 py-2 border-b border-slate-100 bg-violet-50">
                    <div className="flex gap-1.5">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => { setInput(e.target.value); setError(null) }}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            placeholder="부품 번호 (예: 122971)"
                            className="flex-1 text-xs px-2 py-1.5 rounded-md border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-violet-400 min-w-0"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={adding || !input.trim()}
                            className="px-2.5 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-md disabled:opacity-40 hover:bg-violet-700 shrink-0"
                        >
                            {adding ? <Loader2 className="w-3 h-3 animate-spin" /> : '등록'}
                        </button>
                    </div>
                    {error && <p className="text-[11px] text-red-500 mt-1">{error}</p>}
                </div>
            )}

            {/* Parts list */}
            <div className="flex-1 overflow-y-auto">
                {hotspots.length === 0 ? (
                    <p className="text-[11px] text-slate-400 px-3 py-4 text-center leading-relaxed">
                        등록된 부품 번호가 없습니다.<br />AI 자동 감지를 눌러보세요.
                    </p>
                ) : filtered.length === 0 ? (
                    <p className="text-[11px] text-slate-400 px-3 py-4 text-center">
                        검색 결과가 없습니다
                    </p>
                ) : (
                    <div className="divide-y divide-slate-50">
                        {filtered.map(h => (
                            <div key={h.id} className="flex items-start gap-2 px-3 py-2.5 hover:bg-slate-50 group">
                                <div className="flex-1 min-w-0">
                                    <Link
                                        href={`/diagrams/parts?q=${h.articleNo}`}
                                        className="font-mono text-xs font-bold text-violet-600 hover:underline block"
                                    >
                                        {h.articleNo}
                                    </Link>
                                    {(h.description ?? h.label) && (
                                        <span className="text-[11px] text-slate-400 leading-tight line-clamp-2 block mt-0.5">
                                            {h.description ?? h.label}
                                        </span>
                                    )}
                                </div>
                                <button
                                    onClick={() => handleDelete(h.id)}
                                    className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-opacity shrink-0 mt-0.5"
                                >
                                    <X className="w-3.5 h-3.5" />
                                </button>
                            </div>
                        ))}
                    </div>
                )}
            </div>
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
    const lsKey = `diagram_v_${diagram.id}`
    const [imgCacheBust, setImgCacheBust] = useState<number>(() => {
        if (typeof window === 'undefined') return 0
        return parseInt(localStorage.getItem(`diagram_v_${diagram.id}`) ?? '0', 10)
    })
    const [rotating, setRotating] = useState(false)

    // ── Manual rotation ───────────────────────────────────────────────────────
    const handleRotate = useCallback(async (degrees: 90 | 270) => {
        setRotating(true)
        try {
            const res = await fetch(`/api/diagrams/${diagram.id}/rotate`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ degrees }),
            })
            if (res.ok) {
                const newV = Date.now()
                localStorage.setItem(lsKey, String(newV))
                setImgCacheBust(newV)
            }
        } finally {
            setRotating(false)
        }
    }, [diagram.id])

    // ── Zoom ─────────────────────────────────────────────────────────────────
    const zoom = useCallback((factor: number) => {
        setScale(s => Math.min(8, Math.max(0.3, s * factor)))
    }, [])

    const reset = useCallback(() => { setScale(1); setOffset({ x: 0, y: 0 }) }, [])

    const handleWheel = useCallback((e: React.WheelEvent) => {
        e.preventDefault()
        zoom(e.deltaY < 0 ? 1.1 : 0.9)
    }, [zoom])

    // ── Mouse Pan ────────────────────────────────────────────────────────────
    const handleMouseDown = (e: React.MouseEvent) => {
        setIsDragging(true)
        setDragStart({ x: e.clientX, y: e.clientY, ox: offset.x, oy: offset.y })
    }
    const handleMouseMove = (e: React.MouseEvent) => {
        if (!isDragging) return
        setOffset({ x: dragStart.ox + (e.clientX - dragStart.x), y: dragStart.oy + (e.clientY - dragStart.y) })
    }
    const handleMouseUp = () => setIsDragging(false)

    // ── Touch Pan & Pinch-Zoom ────────────────────────────────────────────────
    const touchRef = useRef<{ lastX: number; lastY: number; lastDist: number | null } | null>(null)
    const scaleRef = useRef(scale)
    const offsetRef = useRef(offset)
    scaleRef.current = scale
    offsetRef.current = offset

    useEffect(() => {
        const el = containerRef.current
        if (!el) return

        const onTouchStart = (e: TouchEvent) => {
            if (e.touches.length === 1) {
                touchRef.current = { lastX: e.touches[0].clientX, lastY: e.touches[0].clientY, lastDist: null }
            } else if (e.touches.length === 2) {
                const dist = Math.hypot(
                    e.touches[1].clientX - e.touches[0].clientX,
                    e.touches[1].clientY - e.touches[0].clientY
                )
                touchRef.current = {
                    lastX: (e.touches[0].clientX + e.touches[1].clientX) / 2,
                    lastY: (e.touches[0].clientY + e.touches[1].clientY) / 2,
                    lastDist: dist,
                }
            }
        }

        const onTouchMove = (e: TouchEvent) => {
            e.preventDefault()
            if (!touchRef.current) return

            if (e.touches.length === 1 && touchRef.current.lastDist === null) {
                const dx = e.touches[0].clientX - touchRef.current.lastX
                const dy = e.touches[0].clientY - touchRef.current.lastY
                setOffset(prev => ({ x: prev.x + dx, y: prev.y + dy }))
                touchRef.current.lastX = e.touches[0].clientX
                touchRef.current.lastY = e.touches[0].clientY
            } else if (e.touches.length === 2 && touchRef.current.lastDist !== null) {
                const dist = Math.hypot(
                    e.touches[1].clientX - e.touches[0].clientX,
                    e.touches[1].clientY - e.touches[0].clientY
                )
                const factor = dist / touchRef.current.lastDist
                setScale(s => Math.min(8, Math.max(0.3, s * factor)))
                touchRef.current.lastDist = dist
            }
        }

        const onTouchEnd = () => { touchRef.current = null }

        el.addEventListener('touchstart', onTouchStart, { passive: false })
        el.addEventListener('touchmove', onTouchMove, { passive: false })
        el.addEventListener('touchend', onTouchEnd)
        return () => {
            el.removeEventListener('touchstart', onTouchStart)
            el.removeEventListener('touchmove', onTouchMove)
            el.removeEventListener('touchend', onTouchEnd)
        }
    }, [])

    return (
        <div className="flex flex-col h-[calc(100vh-80px)]">
            {/* ── Toolbar ── */}
            <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200 shrink-0">
                <div className="flex items-center gap-0.5 shrink-0 border-r border-slate-200 pr-2 mr-0.5">
                    <button onClick={() => handleRotate(270)} disabled={rotating} title="반시계 방향 90° 회전" className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-600 disabled:opacity-40">
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button onClick={() => handleRotate(90)} disabled={rotating} title="시계 방향 90° 회전" className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-600 disabled:opacity-40">
                        {rotating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                    </button>
                </div>
                <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => zoom(0.8)} className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-600"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs text-slate-500 w-9 text-center hidden sm:inline">{Math.round(scale * 100)}%</span>
                    <button onClick={() => zoom(1.25)} className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-600"><ZoomIn className="w-4 h-4" /></button>
                    <button onClick={reset} title="뷰 초기화" className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500"><RotateCcw className="w-3.5 h-3.5" /></button>
                </div>
                <div className="ml-auto shrink-0">
                    <Link href="/diagrams/parts" className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 text-xs font-semibold transition-colors">
                        <Search className="w-3.5 h-3.5" />
                        부품 검색
                    </Link>
                </div>
            </div>

            {/* ── Body: sidebar + canvas ── */}
            <div className="flex flex-1 overflow-hidden">
                {/* Left parts sidebar */}
                <PartsPanel diagramId={diagram.id} />

                {/* Canvas */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-hidden relative bg-slate-100 select-none"
                    style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                    onWheel={handleWheel}
                    onMouseDown={handleMouseDown}
                    onMouseMove={handleMouseMove}
                    onMouseUp={handleMouseUp}
                    onMouseLeave={handleMouseUp}
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
                        <img
                            src={`/api/diagrams/${diagram.id}/image${imgCacheBust > 0 ? `?v=${imgCacheBust}` : ''}`}
                            alt={diagram.name}
                            draggable={false}
                            className="block max-w-none shadow-xl"
                            style={{ maxWidth: '80vw', maxHeight: '85vh', width: 'auto', height: 'auto' }}
                        />
                    </div>
                </div>
            </div>
        </div>
    )
}
