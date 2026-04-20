'use client'

import { useEffect } from 'react'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function DiagramsError({
    error,
    reset,
}: {
    error: Error & { digest?: string }
    reset: () => void
}) {
    useEffect(() => {
        console.error('Diagrams page error:', error)
    }, [error])

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6">
            <div className="flex flex-col items-center justify-center py-32 text-center gap-4">
                <AlertTriangle className="w-12 h-12 text-amber-400" />
                <div>
                    <p className="text-lg font-bold text-slate-700">도면을 불러오지 못했습니다</p>
                    <p className="text-sm text-slate-400 mt-1">일시적인 서버 연결 오류입니다. 잠시 후 다시 시도해 주세요.</p>
                </div>
                <button
                    onClick={reset}
                    className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-blue-600 text-white text-sm font-bold hover:bg-blue-700 transition-colors"
                >
                    <RefreshCw className="w-4 h-4" />
                    다시 시도
                </button>
            </div>
        </div>
    )
}
