'use client'

import { useState, useEffect, useTransition } from 'react'
import { signOut } from 'next-auth/react'
import { changePIN } from '@/app/actions'
import Link from 'next/link'
import { User, LogOut, KeyRound, X, Minus, Plus, Sun, Moon } from 'lucide-react'
import { useTheme } from 'next-themes'
import { usePathname } from 'next/navigation'
export function NavBar({ userName }: { userName: string }) {
    const [showPinModal, setShowPinModal] = useState(false)
    const [currentPin, setCurrentPin] = useState('')
    const [newPin, setNewPin] = useState('')
    const [step, setStep] = useState<'current' | 'new'>('current')
    const [pinError, setPinError] = useState('')
    const [pinSuccess, setPinSuccess] = useState(false)
    const [isPending, startTransition] = useTransition()
    const { theme, setTheme } = useTheme()
    const [mounted, setMounted] = useState(false)
    const pathname = usePathname()
    const [hasNewBids, setHasNewBids] = useState(false)

    useEffect(() => {
        setMounted(true)
    }, [])

    useEffect(() => {
        const checkNewBids = async () => {
            const today = new Date()
            const dateStr = today.toISOString().split('T')[0].replace(/-/g, '')
            
            if (pathname === '/bids') {
                localStorage.setItem('bidsViewed', dateStr)
                setHasNewBids(false)
                return
            }

            if (localStorage.getItem('bidsViewed') === dateStr) {
                setHasNewBids(false)
                return
            }

            const cachedTime = sessionStorage.getItem('bidsCheckTime')
            const cachedDate = sessionStorage.getItem('bidsCheckDate')
            const now = Date.now()

            if (cachedDate === dateStr && cachedTime && now - parseInt(cachedTime) < 30 * 60 * 1000) {
                setHasNewBids(sessionStorage.getItem('bidsNew') === 'true')
                return
            }

            try {
                const res = await fetch(`/api/bids?startDate=${dateStr}0000&endDate=${dateStr}2359`)
                if (res.ok) {
                    const data = await res.json()
                    const isNew = data.items?.length > 0
                    setHasNewBids(isNew)
                    sessionStorage.setItem('bidsCheckTime', now.toString())
                    sessionStorage.setItem('bidsCheckDate', dateStr)
                    sessionStorage.setItem('bidsNew', isNew ? 'true' : 'false')
                }
            } catch (e) {}
        }
        checkNewBids()
    }, [pathname])

    const activePin = step === 'current' ? currentPin : newPin
    const setActivePin = step === 'current' ? setCurrentPin : setNewPin

    const handleDigit = (d: string) => {
        if (activePin.length < 4) setActivePin(prev => prev + d)
    }
    const handleDelete = () => setActivePin(prev => prev.slice(0, -1))

    const handleNext = () => {
        if (step === 'current' && currentPin.length === 4) {
            setStep('new')
            setPinError('')
        }
    }

    const handleChange = () => {
        if (newPin.length !== 4) return
        setPinError('')
        const fd = new FormData()
        fd.append('currentPin', currentPin)
        fd.append('newPin', newPin)
        startTransition(async () => {
            try {
                await changePIN(fd)
                setPinSuccess(true)
                setTimeout(() => {
                    setShowPinModal(false)
                    setPinSuccess(false)
                    setCurrentPin(''); setNewPin(''); setStep('current')
                }, 1500)
            } catch (e: unknown) {
                const msg = e instanceof Error ? e.message : 'PIN 변경 실패'
                setPinError(msg)
                setCurrentPin(''); setNewPin(''); setStep('current')
            }
        })
    }

    const closeModal = () => {
        setShowPinModal(false)
        setCurrentPin(''); setNewPin('')
        setStep('current'); setPinError(''); setPinSuccess(false)
    }

    const isPath = (path: string) => pathname?.startsWith(path) || false;

    return (
        <>
            <nav className="bg-white dark:bg-slate-900 text-slate-900 dark:text-white px-4 py-2.5 shadow-md sticky top-0 z-50 border-b border-slate-200 dark:border-slate-800">
                <div className="max-w-4xl mx-auto flex justify-between items-center">
                    <Link href="/" className="font-bold text-lg sm:text-xl text-blue-600 dark:text-white hover:text-blue-700 dark:hover:text-slate-300 transition-colors tracking-tight">
                        <span className="sm:hidden">Rosin</span>
                        <span className="hidden sm:inline">Rosin Systech CO., LTD</span>
                    </Link>
                    
                    <div className="flex items-center">
                        {/* Desktop Menu */}
                        <div className="hidden sm:flex items-center gap-5">
                            <Link href="/bids" className={`relative text-sm font-medium transition-colors ${isPath('/bids') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
                                <span className="mr-1">📋</span><span className="inline">입찰공고</span>
                                {hasNewBids && (
                                    <span className="absolute -top-1 -right-2 flex h-2 w-2">
                                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-500"></span>
                                    </span>
                                )}
                            </Link>
                            <Link href="/pools" className={`text-sm font-medium transition-colors ${isPath('/pools') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
                                <span className="mr-1">🏗️</span><span className="inline">준공예정</span>
                            </Link>
                            <Link href="/delivery" className={`text-sm font-medium transition-colors ${isPath('/delivery') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
                                <span className="mr-1">🚚</span><span className="inline">납품 캘린더</span>
                            </Link>
                            <Link href="/parts" className={`text-sm font-medium transition-colors ${isPath('/parts') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
                                <span className="mr-1">📦</span><span className="inline">부품 재고</span>
                            </Link>
                            <Link href="/checklist" className={`text-sm font-medium transition-colors ${isPath('/checklist') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white'}`}>
                                <span className="mr-1">✅</span><span className="inline">업무체크</span>
                            </Link>
                        </div>

                        {/* Top-Right Action Menu (always visible) */}
                        <div className="flex items-center gap-2.5 sm:gap-3 ml-0 sm:ml-5 pl-0 sm:pl-5 sm:border-l border-slate-200 dark:border-slate-700">
                            <User className="w-4 h-4 text-slate-500 dark:text-slate-400 hidden sm:block" />
                            <span className="text-sm font-semibold text-slate-700 dark:text-white hidden sm:inline">{userName}</span>
                            {mounted && (
                                <button
                                    onClick={() => setTheme(theme === 'dark' ? 'light' : 'dark')}
                                    title="테마 변경"
                                    className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors sm:ml-1"
                                >
                                    {theme === 'dark' ? <Sun className="w-5 h-5 sm:w-4 sm:h-4" /> : <Moon className="w-5 h-5 sm:w-4 sm:h-4" />}
                                </button>
                            )}
                            <button
                                onClick={() => setShowPinModal(true)}
                                title="PIN 변경"
                                className="text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white transition-colors"
                            >
                                <KeyRound className="w-5 h-5 sm:w-4 sm:h-4" />
                            </button>
                            <button
                                onClick={() => signOut({ callbackUrl: '/login' })}
                                title="로그아웃"
                                className="text-slate-500 hover:text-red-500 dark:text-slate-400 dark:hover:text-red-400 transition-colors"
                            >
                                <LogOut className="w-5 h-5 sm:w-4 sm:h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            </nav>

            {/* Mobile Bottom Navigation */}
            <nav className="sm:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200 dark:border-slate-800 shadow-[0_-4px_10px_rgba(0,0,0,0.05)] pb-[env(safe-area-inset-bottom)]">
                <div className="flex items-center justify-around h-14 px-1">
                    <Link href="/bids" className={`relative flex flex-col items-center justify-center w-full h-full transition-colors ${isPath('/bids') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                        <span className={`text-[20px] mb-[2px] ${isPath('/bids') ? '' : 'opacity-80 grayscale-[20%]'}`}>📋</span>
                        <span className="text-[10px] font-bold">입찰공고</span>
                        {hasNewBids && (
                            <span className="absolute top-[6px] right-4 flex h-[6px] w-[6px]">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full bg-red-500 h-[6px] w-[6px]"></span>
                            </span>
                        )}
                    </Link>
                    <Link href="/pools" className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isPath('/pools') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                        <span className={`text-[20px] mb-[2px] ${isPath('/pools') ? '' : 'opacity-80 grayscale-[20%]'}`}>🏗️</span>
                        <span className="text-[10px] font-bold">준공예정</span>
                    </Link>
                    <Link href="/delivery" className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isPath('/delivery') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                        <span className={`text-[20px] mb-[2px] ${isPath('/delivery') ? '' : 'opacity-80 grayscale-[20%]'}`}>🚚</span>
                        <span className="text-[10px] font-bold">납품캘린더</span>
                    </Link>
                    <Link href="/parts" className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isPath('/parts') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                        <span className={`text-[20px] mb-[2px] ${isPath('/parts') ? '' : 'opacity-80 grayscale-[20%]'}`}>📦</span>
                        <span className="text-[10px] font-bold">부품재고</span>
                    </Link>
                    <Link href="/checklist" className={`flex flex-col items-center justify-center w-full h-full transition-colors ${isPath('/checklist') ? 'text-blue-600 dark:text-blue-400' : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'}`}>
                        <span className={`text-[20px] mb-[2px] ${isPath('/checklist') ? '' : 'opacity-80 grayscale-[20%]'}`}>✅</span>
                        <span className="text-[10px] font-bold">업무체크</span>
                    </Link>
                </div>
            </nav>

            {/* PIN Change Modal */}
            {showPinModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-xs p-6">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-900 flex items-center gap-2">
                                <KeyRound className="w-5 h-5 text-blue-600" /> PIN 변경
                            </h2>
                            <button onClick={closeModal} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {pinSuccess ? (
                            <div className="text-center py-6">
                                <p className="text-3xl mb-2">✅</p>
                                <p className="font-bold text-green-600">PIN이 변경되었습니다!</p>
                            </div>
                        ) : (
                            <>
                                <p className="text-sm text-slate-500 text-center mb-4">
                                    {step === 'current' ? '현재 PIN을 입력하세요' : '새 PIN을 입력하세요'}
                                </p>

                                {/* Dots */}
                                <div className="flex justify-center gap-4 mb-4">
                                    {[0, 1, 2, 3].map(i => (
                                        <div key={i} className={`w-4 h-4 rounded-full border-2 transition-all ${i < activePin.length ? 'bg-blue-600 border-blue-600' : 'border-slate-300'}`} />
                                    ))}
                                </div>

                                {pinError && <p className="text-red-500 text-sm text-center mb-3 font-medium">{pinError}</p>}

                                {/* Numpad */}
                                <div className="grid grid-cols-3 gap-2 mb-4">
                                    {['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫'].map((key, idx) => (
                                        <button
                                            key={idx}
                                            onClick={() => key === '⌫' ? handleDelete() : key !== '' ? handleDigit(key) : undefined}
                                            disabled={key === ''}
                                            className={`h-12 rounded-xl text-lg font-bold transition-all ${key === '' ? 'cursor-default'
                                                : key === '⌫' ? 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                                                    : 'bg-slate-50 text-slate-800 hover:bg-blue-50 hover:text-blue-700 border border-slate-200'
                                                }`}
                                        >
                                            {key}
                                        </button>
                                    ))}
                                </div>

                                {step === 'current' ? (
                                    <button
                                        onClick={handleNext}
                                        disabled={currentPin.length !== 4}
                                        className="w-full py-3 rounded-xl bg-slate-800 text-white font-bold hover:bg-slate-700 transition-colors disabled:opacity-40"
                                    >
                                        다음
                                    </button>
                                ) : (
                                    <button
                                        onClick={handleChange}
                                        disabled={newPin.length !== 4 || isPending}
                                        className="w-full py-3 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors disabled:opacity-40"
                                    >
                                        {isPending ? '변경 중...' : 'PIN 변경'}
                                    </button>
                                )}
                            </>
                        )}
                    </div>
                </div>
            )}
        </>
    )
}
