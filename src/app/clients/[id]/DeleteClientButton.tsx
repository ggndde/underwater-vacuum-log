'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Trash2, X, AlertTriangle } from 'lucide-react'

type Props = {
    customerId: number
    customerName: string
}

export default function DeleteClientButton({ customerId, customerName }: Props) {
    const router = useRouter()
    const [confirm, setConfirm] = useState(false)
    const [loading, setLoading] = useState(false)

    const handleDelete = async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/clients/${customerId}`, { method: 'DELETE' })
            if (!res.ok) {
                const data = await res.json()
                alert(data.error || '삭제에 실패했습니다.')
                return
            }
            router.push('/clients')
            router.refresh()
        } catch {
            alert('네트워크 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            <button
                onClick={() => setConfirm(true)}
                className="inline-flex items-center gap-1.5 text-sm text-slate-400 hover:text-red-500 transition-colors px-2 py-1 rounded-lg hover:bg-red-50"
            >
                <Trash2 className="w-4 h-4" />
                거래처 삭제
            </button>

            {confirm && (
                <div className="fixed inset-0 z-50 flex items-center justify-center">
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={() => setConfirm(false)}
                    />
                    <div className="relative bg-white rounded-2xl shadow-2xl p-6 w-full max-w-sm mx-4">
                        <div className="flex flex-col items-center text-center">
                            <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mb-4">
                                <AlertTriangle className="w-7 h-7 text-red-500" />
                            </div>
                            <h2 className="text-lg font-bold text-slate-800 mb-2">거래처를 삭제하시겠습니까?</h2>
                            <p className="text-sm text-slate-500 mb-1">
                                <span className="font-semibold text-slate-700">{customerName}</span>
                            </p>
                            <p className="text-sm text-red-500 mb-6">
                                모든 장비, 서비스 기록, 견적서, 지출 데이터가<br />
                                함께 삭제되며 복구할 수 없습니다.
                            </p>
                            <div className="flex gap-3 w-full">
                                <button
                                    onClick={() => setConfirm(false)}
                                    disabled={loading}
                                    className="flex-1 py-2.5 rounded-xl border border-slate-300 text-slate-600 font-semibold hover:bg-slate-50 transition flex items-center justify-center gap-1"
                                >
                                    <X className="w-4 h-4" />
                                    취소
                                </button>
                                <button
                                    onClick={handleDelete}
                                    disabled={loading}
                                    className="flex-1 py-2.5 rounded-xl bg-red-500 hover:bg-red-600 text-white font-semibold transition disabled:opacity-50 flex items-center justify-center gap-1"
                                >
                                    <Trash2 className="w-4 h-4" />
                                    {loading ? '삭제 중...' : '삭제'}
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            )}
        </>
    )
}
