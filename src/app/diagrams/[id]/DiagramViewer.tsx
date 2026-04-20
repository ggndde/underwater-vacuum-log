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
    const [input, setInput] = useState('')
    const [adding, setAdding] = useState(false)
    const [detecting, setDetecting] = useState(false)
    const [detectResult, setDetectResult] = useState<string | null>(null)
    const [error, setError] = useState<string | null>(null)
    const [showInput, setShowInput] = useState(false)
    const inputRef = useRef<HTMLInputElement>(null)

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
        <div className="border-t border-slate-200 bg-white">
            <div className="flex items-center justify-between px-3 py-2 border-b border-slate-100">
                <span className="text-xs font-semibold text-slate-500 flex items-center gap-1.5">
                    <Tag className="w-3.5 h-3.5" />
                    이 도면의 부품 번호
                    {hotspots.length > 0 && (
                        <span className="bg-violet-100 text-violet-600 rounded-full px-1.5 py-0.5 text-[10px] font-bold">{hotspots.length}</span>
                    )}
                </span>
                <div className="flex items-center gap-2">
                    <button
                        onClick={handleAutoDetect}
                        disabled={detecting}
                        className="flex items-center gap-1 text-xs text-amber-600 hover:text-amber-700 font-medium disabled:opacity-50"
                        title="AI로 도면에서 6자리 부품 번호를 자동 감지"
                    >
                        {detecting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                        {detecting ? '감지 중...' : 'AI 자동 감지'}
                    </button>
                    <button
                        onClick={() => { setShowInput(v => !v); setError(null) }}
                        className="flex items-center gap-1 text-xs text-violet-600 hover:text-violet-700 font-medium"
                    >
                        <Plus className="w-3.5 h-3.5" />
                        직접 추가
                    </button>
                </div>
            </div>
            {(detectResult || (error && !showInput)) && (
                <div className={`px-3 py-1.5 text-xs border-b border-slate-100 ${detectResult ? 'text-green-600 bg-green-50' : 'text-red-500 bg-red-50'}`}>
                    {detectResult ?? error}
                </div>
            )}

            {showInput && (
                <div className="px-3 py-2 border-b border-slate-100 bg-violet-50">
                    <div className="flex gap-2">
                        <input
                            ref={inputRef}
                            type="text"
                            value={input}
                            onChange={e => { setInput(e.target.value); setError(null) }}
                            onKeyDown={e => e.key === 'Enter' && handleAdd()}
                            placeholder="부품 번호 입력 (예: 122971)"
                            className="flex-1 text-sm px-2.5 py-1.5 rounded-lg border border-slate-200 bg-white outline-none focus:ring-2 focus:ring-violet-400"
                        />
                        <button
                            onClick={handleAdd}
                            disabled={adding || !input.trim()}
                            className="px-3 py-1.5 bg-violet-600 text-white text-xs font-bold rounded-lg disabled:opacity-40 hover:bg-violet-700"
                        >
                            {adding ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : '등록'}
                        </button>
                    </div>
                    {error && <p className="text-xs text-red-500 mt-1">{error}</p>}
                </div>
            )}

            {hotspots.length === 0 ? (
                <p className="text-xs text-slate-400 px-3 py-3 text-center">
                    아직 등록된 부품 번호가 없습니다
                </p>
            ) : (
                <div className="max-h-40 overflow-y-auto divide-y divide-slate-50">
                    {hotspots.map(h => (
                        <div key={h.id} className="flex items-center gap-2 px-3 py-2 hover:bg-slate-50 group">
                            <Link
                                href={`/diagrams/parts?q=${h.articleNo}`}
                                className="font-mono text-xs font-bold text-violet-600 hover:underline shrink-0"
                            >
                                {h.articleNo}
                            </Link>
                            <span className="text-xs text-slate-500 flex-1 truncate">
                                {h.description ?? h.label ?? ''}
                            </span>
                            <button
                                onClick={() => handleDelete(h.id)}
                                className="opacity-0 group-hover:opacity-100 text-slate-300 hover:text-red-400 transition-opacity shrink-0"
                            >
                                <X className="w-3.5 h-3.5" />
                            </button>
                        </div>
                    ))}
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
            <div className="flex items-center gap-2 px-3 py-2 bg-white border-b border-slate-200">
                {/* Rotate image buttons */}
                <div className="flex items-center gap-0.5 shrink-0 border-r border-slate-200 pr-2 mr-0.5">
                    <button
                        onClick={() => handleRotate(270)}
                        disabled={rotating}
                        title="반시계 방향 90° 회전"
                        className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-600 disabled:opacity-40"
                    >
                        <RotateCcw className="w-4 h-4" />
                    </button>
                    <button
                        onClick={() => handleRotate(90)}
                        disabled={rotating}
                        title="시계 방향 90° 회전"
                        className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-600 disabled:opacity-40"
                    >
                        {rotating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RotateCw className="w-4 h-4" />}
                    </button>
                </div>

                {/* Zoom controls */}
                <div className="flex items-center gap-0.5 shrink-0">
                    <button onClick={() => zoom(0.8)} className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-600"><ZoomOut className="w-4 h-4" /></button>
                    <span className="text-xs text-slate-500 w-9 text-center hidden sm:inline">{Math.round(scale * 100)}%</span>
                    <button onClick={() => zoom(1.25)} className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-600"><ZoomIn className="w-4 h-4" /></button>
                    <button onClick={reset} title="뷰 초기화" className="p-2 rounded-lg hover:bg-slate-100 active:bg-slate-200 text-slate-500"><RotateCcw className="w-3.5 h-3.5" /></button>
                </div>

                {/* Parts catalog search link */}
                <div className="ml-auto shrink-0">
                    <Link
                        href="/diagrams/parts"
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-50 text-violet-600 hover:bg-violet-100 text-xs font-semibold transition-colors"
                    >
                        <Search className="w-3.5 h-3.5" />
                        부품 검색
                    </Link>
                </div>
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
                        style={{ maxWidth: '80vw', maxHeight: '60vh', width: 'auto', height: 'auto' }}
                    />
                </div>
            </div>

            {/* ── Parts Panel ── */}
            <PartsPanel diagramId={diagram.id} />
        </div>
    )
}
