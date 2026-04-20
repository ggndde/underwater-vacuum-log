'use client'

import { useState, useRef, useCallback, useEffect } from 'react'
import { ZoomIn, ZoomOut, RotateCcw, RotateCw, Loader2 } from 'lucide-react'

type Diagram = {
    id: number
    name: string
    drawingNo: string | null
    category: string
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
                        style={{ maxWidth: '80vw', maxHeight: '70vh', width: 'auto', height: 'auto' }}
                    />
                </div>
            </div>
        </div>
    )
}
