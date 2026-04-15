'use client'

import { useState, useRef, useTransition } from 'react'
import { Upload, X, FileText, Loader2, CheckCircle2, Trash2, AlertCircle } from 'lucide-react'

type ParsedPart = {
    articleNo: string
    name: string
    category: string
    stock: number
}

const CATEGORIES = ['CP', 'PP', 'NV3', '공용'] as const

const CATEGORY_COLORS: Record<string, string> = {
    CP: 'bg-blue-100 text-blue-700',
    PP: 'bg-purple-100 text-purple-700',
    NV3: 'bg-teal-100 text-teal-700',
    '공용': 'bg-slate-100 text-slate-600',
}

export function PdfImportModal({ onClose, onImported }: { onClose: () => void; onImported: () => void }) {
    const fileRef = useRef<HTMLInputElement>(null)
    const [step, setStep] = useState<'upload' | 'parsing' | 'preview' | 'importing' | 'done'>('upload')
    const [error, setError] = useState<string | null>(null)
    const [parts, setParts] = useState<ParsedPart[]>([])
    const [result, setResult] = useState<{ created: number; total: number } | null>(null)
    const [, startTransition] = useTransition()

    // ── Step 1: Upload & Parse ─────────────────────────────────────────────
    async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
        const file = e.target.files?.[0]
        if (!file) return
        if (file.type !== 'application/pdf') {
            setError('PDF 파일만 업로드할 수 있습니다.')
            return
        }

        setError(null)
        setStep('parsing')

        const fd = new FormData()
        fd.append('file', file)

        try {
            const res = await fetch('/api/parts/import-pdf', { method: 'POST', body: fd })
            const json = await res.json()

            if (!res.ok) {
                setError(json.error ?? '파싱에 실패했습니다.')
                setStep('upload')
                return
            }

            const initialParts: ParsedPart[] = (json.parts as ParsedPart[]).map((p) => ({
                ...p,
                stock: 0,
            }))
            setParts(initialParts)
            setStep('preview')
        } catch {
            setError('네트워크 오류가 발생했습니다.')
            setStep('upload')
        }
    }

    // ── Step 2: Edit preview ───────────────────────────────────────────────
    function updatePart(idx: number, field: keyof ParsedPart, value: string | number) {
        setParts((prev) => prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p)))
    }

    function removePart(idx: number) {
        setParts((prev) => prev.filter((_, i) => i !== idx))
    }

    // ── Step 3: Bulk Import ────────────────────────────────────────────────
    async function handleImport() {
        if (parts.length === 0) return
        setStep('importing')
        setError(null)

        try {
            const res = await fetch('/api/parts/bulk-import', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ parts }),
            })
            const json = await res.json()

            if (!res.ok) {
                setError(json.error ?? '등록에 실패했습니다.')
                setStep('preview')
                return
            }

            setResult(json)
            setStep('done')
        } catch {
            setError('네트워크 오류가 발생했습니다.')
            setStep('preview')
        }
    }

    // ── Render ─────────────────────────────────────────────────────────────
    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center bg-black/40 backdrop-blur-sm p-4 overflow-y-auto">
            <div className="relative bg-white rounded-2xl shadow-xl w-full max-w-4xl mt-8 mb-8">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
                    <h2 className="font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-500" />
                        PDF로 부품 일괄 가져오기
                    </h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6">
                    {/* Error */}
                    {error && (
                        <div className="mb-4 flex items-start gap-2 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
                            <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />
                            {error}
                        </div>
                    )}

                    {/* STEP: upload */}
                    {step === 'upload' && (
                        <div className="flex flex-col items-center justify-center py-16 border-2 border-dashed border-slate-200 rounded-2xl cursor-pointer hover:border-blue-400 hover:bg-blue-50 transition-colors"
                            onClick={() => fileRef.current?.click()}>
                            <Upload className="w-10 h-10 text-slate-300 mb-3" />
                            <p className="font-semibold text-slate-600">PDF 파일을 클릭하여 업로드</p>
                            <p className="text-sm text-slate-400 mt-1">제품별 부품 명칭이 담긴 PDF · 최대 20MB</p>
                            <p className="text-xs text-slate-400 mt-3">텍스트 기반 PDF만 지원됩니다 (스캔 이미지 불가)</p>
                            <input
                                ref={fileRef}
                                type="file"
                                accept="application/pdf"
                                className="hidden"
                                onChange={handleFileChange}
                            />
                        </div>
                    )}

                    {/* STEP: parsing */}
                    {step === 'parsing' && (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            <div className="text-center">
                                <p className="font-semibold text-slate-700">PDF 분석 중...</p>
                                <p className="text-sm text-slate-400 mt-1">AI가 부품 목록을 추출하고 있습니다. 30초 정도 걸릴 수 있습니다.</p>
                            </div>
                        </div>
                    )}

                    {/* STEP: preview */}
                    {step === 'preview' && (
                        <>
                            <div className="flex items-center justify-between mb-3">
                                <p className="text-sm text-slate-600">
                                    <span className="font-bold text-slate-800">{parts.length}개</span> 부품이 인식되었습니다.
                                    이름·카테고리·수량을 확인 후 등록하세요.
                                </p>
                                <button
                                    onClick={() => { setStep('upload'); setParts([]); setError(null); if (fileRef.current) fileRef.current.value = '' }}
                                    className="text-xs text-slate-400 hover:text-slate-600 underline"
                                >
                                    다시 업로드
                                </button>
                            </div>

                            {/* Table */}
                            <div className="border border-slate-200 rounded-xl overflow-hidden mb-4">
                                <div className="overflow-y-auto max-h-[50vh]">
                                    <table className="w-full text-sm">
                                        <thead className="sticky top-0 bg-slate-50 border-b border-slate-200">
                                            <tr>
                                                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 w-36">Article No.</th>
                                                <th className="text-left px-3 py-2.5 font-semibold text-slate-500">부품명</th>
                                                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 w-28">카테고리</th>
                                                <th className="text-left px-3 py-2.5 font-semibold text-slate-500 w-20">초기수량</th>
                                                <th className="w-10" />
                                            </tr>
                                        </thead>
                                        <tbody className="divide-y divide-slate-100">
                                            {parts.map((part, idx) => (
                                                <tr key={idx} className="hover:bg-slate-50">
                                                    <td className="px-3 py-1.5">
                                                        <input
                                                            value={part.articleNo}
                                                            onChange={(e) => updatePart(idx, 'articleNo', e.target.value)}
                                                            placeholder="선택"
                                                            className="w-full text-xs bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 outline-none py-0.5"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <input
                                                            value={part.name}
                                                            onChange={(e) => updatePart(idx, 'name', e.target.value)}
                                                            className="w-full bg-transparent border-b border-transparent hover:border-slate-300 focus:border-blue-400 outline-none py-0.5 text-slate-800"
                                                        />
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <select
                                                            value={part.category}
                                                            onChange={(e) => updatePart(idx, 'category', e.target.value)}
                                                            className={`text-xs font-semibold rounded-full px-2 py-0.5 border-0 outline-none cursor-pointer ${CATEGORY_COLORS[part.category] ?? CATEGORY_COLORS['공용']}`}
                                                        >
                                                            {CATEGORIES.map((c) => (
                                                                <option key={c} value={c}>{c}</option>
                                                            ))}
                                                        </select>
                                                    </td>
                                                    <td className="px-3 py-1.5">
                                                        <input
                                                            type="number"
                                                            min={0}
                                                            value={part.stock}
                                                            onChange={(e) => updatePart(idx, 'stock', parseInt(e.target.value) || 0)}
                                                            className="w-14 bg-transparent border-b border-slate-300 focus:border-blue-400 outline-none text-center py-0.5 text-sm"
                                                        />
                                                    </td>
                                                    <td className="px-2 py-1.5">
                                                        <button
                                                            onClick={() => removePart(idx)}
                                                            className="text-slate-300 hover:text-red-400 transition-colors"
                                                        >
                                                            <Trash2 className="w-3.5 h-3.5" />
                                                        </button>
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="flex gap-3 justify-end">
                                <button onClick={onClose} className="px-5 py-2.5 rounded-xl text-sm text-slate-600 hover:bg-slate-100 transition-colors">
                                    취소
                                </button>
                                <button
                                    onClick={handleImport}
                                    disabled={parts.length === 0}
                                    className="px-6 py-2.5 rounded-xl text-sm font-bold bg-blue-600 text-white hover:bg-blue-700 disabled:opacity-50 transition-colors"
                                >
                                    {parts.length}개 부품 등록
                                </button>
                            </div>
                        </>
                    )}

                    {/* STEP: importing */}
                    {step === 'importing' && (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                            <Loader2 className="w-10 h-10 text-blue-500 animate-spin" />
                            <p className="font-semibold text-slate-700">데이터베이스에 등록 중...</p>
                        </div>
                    )}

                    {/* STEP: done */}
                    {step === 'done' && result && (
                        <div className="flex flex-col items-center justify-center py-16 gap-4">
                            <CheckCircle2 className="w-14 h-14 text-green-500" />
                            <div className="text-center">
                                <p className="font-bold text-slate-800 text-lg">등록 완료!</p>
                                <p className="text-slate-500 mt-1">
                                    <span className="font-bold text-blue-600">{result.created}개</span> 부품이 새로 추가되었습니다.
                                    {result.total - result.created > 0 && (
                                        <span className="text-slate-400"> ({result.total - result.created}개는 이미 존재하여 건너뜀)</span>
                                    )}
                                </p>
                            </div>
                            <button
                                onClick={() => { onImported(); onClose() }}
                                className="mt-2 px-8 py-2.5 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
                            >
                                확인
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
