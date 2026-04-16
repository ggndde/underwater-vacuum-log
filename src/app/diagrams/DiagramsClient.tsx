'use client'

import { useState, useRef } from 'react'
import Link from 'next/link'
import {
    Upload, X, Loader2, FileImage, Trash2, AlertCircle,
    MapPin, Calendar, Tag, BookOpen, RefreshCw,
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

// ── Upload Modal ──────────────────────────────────────────────────────────────
function UploadModal({ onClose, onUploaded }: { onClose: () => void; onUploaded: () => void }) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [file, setFile] = useState<File | null>(null)
    const [preview, setPreview] = useState<string | null>(null)
    const [name, setName] = useState('')
    const [drawingNo, setDrawingNo] = useState('')
    const [category, setCategory] = useState<string>('공용')
    const [step, setStep] = useState<'form' | 'uploading' | 'done'>('form')
    const [error, setError] = useState<string | null>(null)
    const [detectedCount, setDetectedCount] = useState(0)

    function handleFileSelect(e: React.ChangeEvent<HTMLInputElement>) {
        const f = e.target.files?.[0]
        if (!f) return
        if (!['image/jpeg', 'image/png', 'image/webp'].includes(f.type)) {
            setError('JPG, PNG, WEBP 이미지만 지원합니다.')
            return
        }
        setFile(f)
        setError(null)
        // auto-fill name from filename
        if (!name) setName(f.name.replace(/\.[^.]+$/, ''))
        const reader = new FileReader()
        reader.onload = (ev) => setPreview(ev.target?.result as string)
        reader.readAsDataURL(f)
    }

    async function handleUpload() {
        if (!file || !name.trim()) return
        setStep('uploading')
        setError(null)

        const fd = new FormData()
        fd.append('file', file)
        fd.append('name', name.trim())
        fd.append('drawingNo', drawingNo.trim())
        fd.append('category', category)

        try {
            const res = await fetch('/api/diagrams', { method: 'POST', body: fd })
            const json = await res.json()
            if (!res.ok) { setError(json.error ?? '업로드 실패'); setStep('form'); return }
            setDetectedCount(json.detectedCount ?? 0)
            setStep('done')
        } catch {
            setError('네트워크 오류가 발생했습니다.')
            setStep('form')
        }
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm p-4">
            <div className="bg-white rounded-2xl shadow-xl w-full max-w-lg">
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <FileImage className="w-5 h-5 text-blue-500" />
                        도면 추가
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600"><X className="w-5 h-5" /></button>
                </div>

                <div className="p-6 space-y-4">
                    {error && (
                        <div className="flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />{error}
                        </div>
                    )}

                    {step === 'uploading' && (
                        <div className="flex flex-col items-center py-12 gap-4">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            <div className="text-center">
                                <p className="font-semibold text-slate-700">이미지 분석 중…</p>
                                <p className="text-sm text-slate-400 mt-1">GPT-4o가 Art. No. 위치를 감지합니다. 30초 정도 걸릴 수 있습니다.</p>
                            </div>
                        </div>
                    )}

                    {step === 'done' && (
                        <div className="flex flex-col items-center py-10 gap-4">
                            <div className="text-5xl">✅</div>
                            <div className="text-center">
                                <p className="font-bold text-slate-800">업로드 완료!</p>
                                <p className="text-slate-500 mt-1">
                                    <span className="font-bold text-blue-600">{detectedCount}개</span> Art. No.가 감지되었습니다.
                                </p>
                                <p className="text-xs text-slate-400 mt-1">도면 뷰어에서 정확도를 확인하고 조정할 수 있습니다.</p>
                            </div>
                            <button
                                onClick={() => { onUploaded(); onClose() }}
                                className="px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    )}

                    {step === 'form' && (
                        <>
                            {/* Image drop zone */}
                            <div
                                onClick={() => fileRef.current?.click()}
                                className="relative border-2 border-dashed border-slate-200 rounded-xl overflow-hidden cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                                style={{ minHeight: '160px' }}
                            >
                                {preview ? (
                                    <img src={preview} alt="미리보기" className="w-full max-h-48 object-contain" />
                                ) : (
                                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-400">
                                        <Upload className="w-8 h-8" />
                                        <p className="text-sm font-medium">클릭하여 도면 이미지 선택</p>
                                        <p className="text-xs">JPG · PNG · WEBP · 최대 15MB</p>
                                        <p className="text-xs text-slate-300">(PDF는 이미지로 내보내기 후 업로드)</p>
                                    </div>
                                )}
                                <input ref={fileRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleFileSelect} />
                            </div>

                            {/* Metadata */}
                            <div className="space-y-3">
                                <div>
                                    <label className="text-xs font-semibold text-slate-500 mb-1 block">도면 이름 *</label>
                                    <input
                                        value={name}
                                        onChange={e => setName(e.target.value)}
                                        placeholder="예: Clubliner Plus - 구동부"
                                        className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <div className="flex-1">
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">도면 번호 (선택)</label>
                                        <input
                                            value={drawingNo}
                                            onChange={e => setDrawingNo(e.target.value)}
                                            placeholder="예: 10003347"
                                            className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                                        />
                                    </div>
                                    <div>
                                        <label className="text-xs font-semibold text-slate-500 mb-1 block">카테고리</label>
                                        <select
                                            value={category}
                                            onChange={e => setCategory(e.target.value)}
                                            className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                                        >
                                            {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                                        </select>
                                    </div>
                                </div>
                            </div>

                            <button
                                onClick={handleUpload}
                                disabled={!file || !name.trim()}
                                className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 disabled:opacity-40 transition-colors"
                            >
                                업로드 및 Art. No. 자동 감지
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}

// ── Main List Component ───────────────────────────────────────────────────────
export function DiagramsClient({ initial }: { initial: DiagramMeta[] }) {
    const [diagrams, setDiagrams] = useState(initial)
    const [showUpload, setShowUpload] = useState(false)
    const [redetecting, setRedetecting] = useState<number | null>(null)

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

    async function handleRedetect(id: number) {
        if (!confirm('AI가 Art. No. 위치를 다시 감지합니다. 기존 위치 정보가 모두 교체됩니다. 계속할까요?')) return
        setRedetecting(id)
        try {
            const res = await fetch(`/api/diagrams/${id}/redetect`, { method: 'POST' })
            const json = await res.json()
            if (res.ok) {
                setDiagrams(prev => prev.map(d =>
                    d.id === id ? { ...d, _count: { hotspots: json.detectedCount } } : d
                ))
                alert(`재탐지 완료: ${json.detectedCount}개 Art. No. 감지됨`)
            } else {
                alert(json.error ?? '재탐지에 실패했습니다.')
            }
        } catch {
            alert('네트워크 오류가 발생했습니다.')
        } finally {
            setRedetecting(null)
        }
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
                    <p className="text-sm text-slate-500 mt-1">도면에 마우스를 올려 Art. No.를 확인하세요</p>
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
                                    <div className="flex items-center gap-1 shrink-0">
                                        <button
                                            onClick={() => handleRedetect(d.id)}
                                            disabled={redetecting === d.id}
                                            title="AI 재탐지"
                                            className="text-slate-300 hover:text-blue-400 transition-colors mt-0.5 disabled:cursor-not-allowed"
                                        >
                                            {redetecting === d.id
                                                ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" />
                                                : <RefreshCw className="w-4 h-4" />
                                            }
                                        </button>
                                        <button
                                            onClick={() => handleDelete(d.id, d.name)}
                                            className="text-slate-300 hover:text-red-400 transition-colors mt-0.5"
                                        >
                                            <Trash2 className="w-4 h-4" />
                                        </button>
                                    </div>
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
                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                        <MapPin className="w-3 h-3" />{d._count.hotspots}개 Art. No.
                                    </span>
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
