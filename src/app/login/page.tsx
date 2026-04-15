'use client';

export const dynamic = 'force-dynamic';

import { useState } from 'react'
import { signIn } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Lock, ChevronLeft } from 'lucide-react'

const EMPLOYEES = ['최민철', '최원응', '배근수', '최지훈']

export default function LoginPage() {
    const router = useRouter()
    const [selectedName, setSelectedName] = useState<string | null>(null)
    const [pin, setPin] = useState('')
    const [error, setError] = useState('')
    const [loading, setLoading] = useState(false)

    const handleDigit = (d: string) => {
        if (pin.length < 4) setPin(prev => prev + d)
    }

    const handleDelete = () => setPin(prev => prev.slice(0, -1))

    const handleLogin = async () => {
        if (!selectedName || pin.length !== 4) return
        setLoading(true)
        setError('')
        const res = await signIn('credentials', {
            name: selectedName,
            pin,
            redirect: false,
        })
        setLoading(false)
        if (res?.ok) {
            router.push('/')
            router.refresh()
        } else {
            setError('PIN이 올바르지 않습니다.')
            setPin('')
        }
    }

    return (
        <div className="min-h-screen bg-slate-900 flex items-center justify-center p-6">
            <div className="w-full max-w-sm">
                {/* Logo */}
                <div className="text-center mb-8">
                    <h1 className="text-2xl font-black text-white tracking-tight">Rosin Systech</h1>
                    <p className="text-slate-400 text-sm mt-1">직원 로그인</p>
                </div>

                <div className="bg-white rounded-2xl shadow-2xl p-6">
                    {!selectedName ? (
                        <>
                            <p className="text-sm font-semibold text-slate-600 mb-4 text-center">이름을 선택하세요</p>
                            <div className="grid grid-cols-2 gap-3">
                                {EMPLOYEES.map(name => (
                                    <button
                                        key={name}
                                        onClick={() => { setSelectedName(name); setPin(''); setError('') }}
                                        className="py-4 rounded-xl bg-slate-50 hover:bg-blue-50 border-2 border-slate-200 hover:border-blue-400 text-slate-800 font-bold text-lg transition-all"
                                    >
                                        {name}
                                    </button>
                                ))}
                            </div>
                        </>
                    ) : (
                        <>
                            {/* Back + name */}
                            <div className="flex items-center gap-2 mb-5">
                                <button onClick={() => { setSelectedName(null); setPin(''); setError('') }} className="text-slate-400 hover:text-slate-700 transition-colors">
                                    <ChevronLeft className="w-5 h-5" />
                                </button>
                                <p className="font-bold text-slate-800 text-lg">{selectedName}</p>
                                <Lock className="w-4 h-4 text-slate-400 ml-auto" />
                            </div>

                            {/* PIN dots */}
                            <div className="flex justify-center gap-4 mb-6">
                                {[0, 1, 2, 3].map(i => (
                                    <div
                                        key={i}
                                        className={`w-4 h-4 rounded-full border-2 transition-all ${i < pin.length
                                                ? 'bg-blue-600 border-blue-600'
                                                : 'border-slate-300'
                                            }`}
                                    />
                                ))}
                            </div>

                            {error && (
                                <p className="text-red-500 text-sm text-center mb-4 font-medium">{error}</p>
                            )}

                            {/* Number pad */}
                            <div className="grid grid-cols-3 gap-2 mb-4">
                                {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => key === '⌫' ? handleDelete() : key !== '' ? handleDigit(key) : undefined}
                                        disabled={key === ''}
                                        className={`h-14 rounded-xl text-xl font-bold transition-all ${key === ''
                                                ? 'cursor-default'
                                                : key === '⌫'
                                                    ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    : 'bg-slate-50 text-slate-800 hover:bg-blue-50 hover:text-blue-700 border border-slate-200'
                                            }`}
                                    >
                                        {key}
                                    </button>
                                ))}
                            </div>

                            <button
                                onClick={handleLogin}
                                disabled={pin.length !== 4 || loading}
                                className="w-full py-3.5 rounded-xl bg-blue-600 text-white font-bold text-lg hover:bg-blue-700 transition-colors disabled:opacity-40"
                            >
                                {loading ? '확인 중...' : '로그인'}
                            </button>
                        </>
                    )}
                </div>
            </div>
        </div>
    )
}
