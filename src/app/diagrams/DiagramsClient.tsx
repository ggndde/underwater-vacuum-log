'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
    Upload, X, Loader2, FileImage, Trash2, AlertCircle,
    Calendar, Tag, BookOpen, CheckCircle2,
} from 'lucide-react'

const CATEGORIES = ['CP', 'PP', 'NV3', '공용'] as const

const CATEGORY_COLORS: Record<string, string> = {
    CP: 'bg-blue-100 text-blue-700',
    PP: 'bg-purple-100 text-purple-700',
    NV3: 'bg-teal-100 text-teal-700',
    '공용': 'bg-slate-100 text-slate-600',
}

type DiagramMeta = {
    id: number
    name: string
    drawingNo: string | null
    category: string
    mimeType: string
    createdAt: string
    _count: { hotspots: number }
}

type FileItem = {
    file: File
    name: string
    drawingNo: string
    category: string
    status: 'pending' | 'uploading' | 'done' | 'error'
    error?: string
}

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [items, setItems] = useState<FileItem[]>([])
    const [uploading, setUploading] = useState(false)
    const [allDone, setAllDone] = useState(false)

    function handleFilesSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const files = Array.from(e.target.files ?? [])
        const valid = files.filter(f => ['image/jpeg', 'image/png', 'image/webp'].includes(f.type))
        setItems(prev => [
            ...prev,
            ...valid.map(f => ({
                file: f,
                name: f.name.replace(/\.[^.]+$/, ''),
                drawingNo: '',
                category: '공용',
                status: 'pending' as const,
            }))
        ])
        // reset input so same file can be added again if needed
        e.target.value = ''
    }

    function removeItem(idx: number) {
        setItems(prev => prev.filter((_, i) => i !== idx))
    }

    function updateItem(idx: number, patch: Partial<FileItem>) {
        setItems(prev => prev.map((it, i) => i === idx ? { ...it, ...patch } : it))
    }

    async function handleUpload() {
        const pending = items.filter(it => it.status === 'pending')
        if (pending.length === 0) return
        setUploading(true)

        for (let i = 0; i < items.length; i++) {
            if (items[i].status !== 'pending') continue
            updateItem(i, { status: 'uploading' })

            const it = items[i]
            const fd = new FormData()
            fd.append('file', it.file)
            fd.append('name', it.name.trim() || it.file.name)
            fd.append('drawingNo', it.drawingNo.trim())
            fd.append('category', it.category)

            try {
                const res = await fetch('/api/diagrams', { method: 'POST', body: fd })
                const json = await res.json()
                if (!res.ok) {
                    updateItem(i, { status: 'error', error: json.error ?? '업로드 실패' })
                } else {
                    updateItem(i, { status: 'done' })
                }
            } catch {
                updateItem(i, { status: 'error', error: '네트워크 오류' })
            }
        }

        setUploading(false)
        setAllDone(true)
        onUploaded()
    }

    const pendingCount = items.filter(it => it.status === 'pending').length
    const doneCount = items.filter(it => it.status === 'done').length

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] flex flex-col">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100 shrink-0">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <FileImage className="w-5 h-5 text-blue-500" />
                        도면 추가
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>

                <div className="flex-1 overflow-y-auto p-6 space-y-4">
                    {/* Drop zone / add more */}
                    {!allDone && (
                        <div
                            onClick={() => fileRef.current?.click()}
                            className="border-2 border-dashed border-slate-200 rounded-xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors flex flex-col items-center py-6 gap-2 text-slate-400"
                        >
                            <Upload className="w-7 h-7" />
                            <p className="text-sm font-medium">클릭하여 도면 이미지 선택</p>
                            <p className="text-xs">JPG · PNG · WEBP · 여러 장 동시 선택 가능</p>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="image/jpeg,image/png,image/webp"
                                multiple
                                className="hidden"
                                onChange={handleFilesSelect}
                            />
                        </div>
                    )}

                    {/* File list */}
                    {items.map((it, i) => (
                        <div key={i} className="border border-slate-200 rounded-xl p-3 space-y-2">
                            <div className="flex items-center gap-2">
                                {it.status === 'pending' && <FileImage className="w-4 h-4 text-slate-400 shrink-0" />}
                                {it.status === 'uploading' && <Loader2 className="w-4 h-4 text-blue-500 animate-spin shrink-0" />}
                                {it.status === 'done' && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                                {it.status === 'error' && <AlertCircle className="w-4 h-4 text-red-400 shrink-0" />}
                                <span className="text-xs text-slate-400 truncate flex-1">{it.file.name}</span>
                                {it.status === 'pending' && !uploading && (
                                    <button onClick={() => removeItem(i)} className="text-slate-300 hover:text-red-400">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                )}
                            </div>

                            {it.status === 'error' && (
                                <p className="text-xs text-red-500">{it.error}</p>
                            )}

                            {(it.status === 'pending' || it.status === 'uploading') && (
                                <div className="space-y-2">
                                    <input
                                        value={it.name}
                                        onChange={e => updateItem(i, { name: e.target.value })}
                                        placeholder="도면 이름"
                                        disabled={uploading}
                                        className="w-full border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                    />
                                    <div className="flex gap-2">
                                        <input
                                            value={it.drawingNo}
                                            onChange={e => updateItem(i, { drawingNo: e.target.value })}
                                            placeholder="도면 번호 (선택)"
                                            disabled={uploading}
                                            className="flex-1 border border-slate-200 rounded-lg px-3 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                                        />
                                        <select
                                            value={it.category}
                                            onChange={e => updateItem(i, { category: e.target.value })}
                                            disabled={uploading}
                                            className="border border-slate-200 rounded-lg px-2 py-1.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white disabled:opacity-50"
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            )}
                        </div>
                    ))}

                    {allDone && doneCount > 0 && (
                        <div className="flex flex-col items-center py-6 gap-3">
                            <div className="text-4xl">✅</div>
                            <p className="font-bold text-slate-800">{doneCount}장 업로드 완료!</p>
                            <button
                                onClick={onClose}
                                className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    )}
                </div>

                {!allDone && items.length > 0 && (
                    <div className="px-6 pb-6 shrink-0">
                        <button
                            onClick={handleUpload}
                            disabled={uploading || pendingCount === 0}
                            className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors flex items-center justify-center gap-2"
                        >
                            {uploading && <Loader2 className="w-4 h-4 animate-spin" />}
                            {uploading ? '업로드 중…' : `${pendingCount}장 업로드`}
                        </button>
                    </div>
                )}
            </div>
        </div>
    )
}

// ── Main List Component ───────────────────────────────────────────────────────
export function DiagramsClient({ initial }: { initial: DiagramMeta[] }) {
    const [diagrams, setDiagrams] = useState(initial)
    const [showUpload, setShowUpload] = useState(false)

    async function refresh() {
        try {
            const res = await fetch('/api/diagrams')
            const json = await res.json()
            if (res.ok) setDiagrams(json.diagrams)
        } catch { }
    }

    async function handleDelete(id: number, name: string) {
        if (!confirm(`"${name}" 도면을 삭제할까요?`)) return
        await fetch(`/api/diagrams/${id}`, { method: 'DELETE' })
        setDiagrams(prev => prev.filter(d => d.id !== id))
    }

    const fmt = new Intl.DateTimeFormat('ko', { year: 'numeric', month: 'short', day: 'numeric' })

    return (
        <>
            <div className="flex items-center justify-between mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                        <BookOpen className="w-6 h-6 text-blue-600" />
                        부품 도면
                    </h1>
                    <p className="text-sm text-slate-500 mt-1">도면을 클릭하면 확대해서 볼 수 있습니다</p>
                </div>
                <button
                    onClick={() => setShowUpload(true)}
                    className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors shadow-sm"
                >
                    <Upload className="w-4 h-4" />
                    도면 추가
                </button>
            </div>

            {diagrams.length === 0 ? (
                <div className="flex flex-col items-center justify-center py-24 text-slate-400 border-2 border-dashed border-slate-200 rounded-2xl">
                    <FileImage className="w-12 h-12 mb-3 opacity-30" />
                    <p className="font-semibold">등록된 도면이 없습니다</p>
                    <p className="text-sm mt-1">위 버튼으로 도면 이미지를 추가하세요</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {diagrams.map(d => (
                        <div key={d.id} className="group bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm hover:shadow-md hover:border-blue-300 transition-all">
                            {/* Thumbnail */}
                            <Link href={`/diagrams/${d.id}`}>
                                <div className="relative bg-slate-50 h-40 overflow-hidden">
                                    <img
                                        src={`/api/diagrams/${d.id}/image`}
                                        alt={d.name}
                                        className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                                    />
                                </div>
                            </Link>

                            {/* Info */}
                            <div className="p-4">
                                <div className="flex items-start justify-between gap-2">
                                    <Link href={`/diagrams/${d.id}`} className="font-semibold text-slate-800 hover:text-blue-600 transition-colors leading-tight">
                                        {d.name}
                                    </Link>
                                    <button
                                        onClick={() => handleDelete(d.id, d.name)}
                                        className="text-slate-300 hover:text-red-400 transition-colors mt-0.5 shrink-0"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>

                                <div className="flex flex-wrap items-center gap-2 mt-2.5">
                                    <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CATEGORY_COLORS[d.category] ?? CATEGORY_COLORS['공용']}`}>
                                        {d.category}
                                    </span>
                                    {d.drawingNo && (
                                        <span className="flex items-center gap-1 text-xs text-slate-400">
                                            <Tag className="w-3 h-3" />{d.drawingNo}
                                        </span>
                                    )}
                                    <span className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
                                        <Calendar className="w-3 h-3" />
                                        {fmt.format(new Date(d.createdAt))}
                                    </span>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {showUpload && (
                <UploadModal
                    onClose={() => setShowUpload(false)}
                    onUploaded={refresh}
                />
            )}
        </>
    )
}
