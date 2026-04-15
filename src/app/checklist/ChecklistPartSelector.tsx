'use client'

import { useState, useTransition } from 'react'
import { PackageOpen, Plus, Trash2, X, Search, Check } from 'lucide-react'
import { batchAddChecklistPart, removeChecklistPart } from '@/app/actions'

export function ChecklistPartSelector({ item, parts }: { item: any; parts: any[] }) {
    const [isPending, startTransition] = useTransition()
    const [showModal, setShowModal] = useState(false)
    const [searchQuery, setSearchQuery] = useState('')
    const [activeTab, setActiveTab] = useState('전체')
    const [selectedParts, setSelectedParts] = useState<{ [id: number]: number }>({}) // partId -> qty

    const CATEGORY_COLORS: Record<string, string> = {
        'CP': 'bg-slate-800 text-white dark:bg-slate-100 dark:text-slate-900', // Matches Parts UI
        'PP': 'bg-blue-100 text-blue-700',
        'NV3': 'bg-violet-100 text-violet-700',
        '공용': 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
    }

    const categories = ['전체', 'CP', 'PP', 'NV3', '공용']

    const usedPartsArray = item.usedParts ? JSON.parse(item.usedParts) : []
    const transactionType = item.hasDelivery ? '택배발송' : '현장사용'

    const filteredParts = parts.filter(p => {
        const matchesSearch = p.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                              p.articleNo.toLowerCase().includes(searchQuery.toLowerCase())
        const matchesTab = activeTab === '전체' || p.category === activeTab
        return matchesSearch && matchesTab
    })

    const handleBatchAdd = async () => {
        const partsToAdd = Object.keys(selectedParts).map(id => ({
            partId: parseInt(id),
            qty: selectedParts[parseInt(id)]
        }))
        if (partsToAdd.length === 0) return

        startTransition(async () => {
            try {
                const result = await batchAddChecklistPart(item.id, partsToAdd, transactionType)
                if (result?.success === false) {
                    alert(result.error)
                    return
                }
                setShowModal(false)
                setSelectedParts({})
                setSearchQuery('')
            } catch (err: any) {
                alert(err.message || '부품 일괄 추가 실패')
            }
        })
    }

    const handleRemove = async (partId: number) => {
        if (!confirm('이 부품 사용 기록을 삭제하고 재고를 복구하시겠습니까?')) return
        startTransition(async () => {
            try {
                const result = await removeChecklistPart(item.id, partId)
                if (result?.success === false) {
                    alert(result.error)
                }
            } catch (err: any) {
                alert(err.message || '삭제 실패')
            }
        })
    }

    const togglePart = (id: number) => {
        setSelectedParts(prev => {
            const next = { ...prev }
            if (next[id]) {
                delete next[id]
            } else {
                next[id] = 1
            }
            return next
        })
    }

    const updateQty = (e: React.MouseEvent, id: number, delta: number) => {
        e.stopPropagation()
        setSelectedParts(prev => {
            const next = { ...prev }
            if (next[id]) {
                next[id] = Math.max(1, next[id] + delta)
            }
            return next
        })
    }

    const selectedCount = Object.keys(selectedParts).length

    return (
        <div className="mt-5 pt-5 border-t border-slate-200 dark:border-slate-700/50">
            <div className="flex items-center justify-between mb-3">
                <div className="flex items-center gap-2">
                    <PackageOpen className="w-4 h-4 sm:w-5 sm:h-5 text-indigo-500" />
                    <span className="text-indigo-600 dark:text-indigo-400 text-sm sm:text-base font-bold">
                        사용한 부품 ({usedPartsArray.length}건)
                    </span>
                </div>
                {!item.completed && (
                    <button
                        onClick={() => setShowModal(true)}
                        className="flex items-center gap-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 dark:bg-indigo-500/20 dark:hover:bg-indigo-500/30 dark:text-indigo-300 font-bold px-3 py-1.5 rounded-lg transition-colors text-xs sm:text-sm"
                    >
                        <Plus className="w-3.5 h-3.5" /> 부품등록
                    </button>
                )}
            </div>

            {/* List */}
            {usedPartsArray.length > 0 ? (
                <div className="bg-slate-50 dark:bg-slate-900/40 rounded-xl border border-slate-200 dark:border-slate-700/50 divide-y divide-slate-200 dark:divide-slate-700/50 mb-3">
                    {usedPartsArray.map((p: any) => (
                        <div key={p.partId} className="flex items-center justify-between px-4 py-2 sm:py-3">
                            <div>
                                <p className="text-sm font-bold text-slate-800 dark:text-slate-200">{p.partName}</p>
                            </div>
                            <div className="flex items-center gap-4">
                                <span className="text-sm font-black text-slate-700 dark:text-slate-300">{p.qty}개</span>
                                {!item.completed && (
                                    <button
                                        onClick={() => handleRemove(p.partId)}
                                        disabled={isPending}
                                        className="text-slate-400 hover:text-red-500 transition-colors disabled:opacity-30 p-1"
                                        title="삭제 및 재고 복구"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))}
                </div>
            ) : (
                <p className="text-xs sm:text-sm text-slate-400 mb-3">등록된 부품이 없습니다.</p>
            )}

            {/* Modal */}
            {showModal && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
                    <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-2xl w-full max-w-md p-6 max-h-[80vh] flex flex-col">
                        <div className="flex items-center justify-between mb-5">
                            <h2 className="text-lg font-bold text-slate-900 dark:text-white flex items-center gap-2">
                                <PackageOpen className="w-5 h-5 text-indigo-500" /> 부품 다중 선택
                            </h2>
                            <button onClick={() => { setShowModal(false); setSelectedParts({}); }} className="text-slate-400 hover:text-slate-700">
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                        
                        <div className="relative mb-3 shrink-0">
                            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
                            <input
                                type="text"
                                value={searchQuery}
                                onChange={e => setSearchQuery(e.target.value)}
                                placeholder="부품명 또는 품번 검색..."
                                className="w-full pl-9 pr-4 py-2 rounded-xl border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900 text-sm outline-none focus:border-indigo-500"
                            />
                        </div>

                        {/* Category Tabs */}
                        <div className="flex gap-1.5 overflow-x-auto pb-3 shrink-0 hide-scrollbar mb-1 px-1">
                            {categories.map(cat => (
                                <button
                                    key={cat}
                                    onClick={() => setActiveTab(cat)}
                                    className={`px-3 py-1.5 rounded-lg text-xs font-bold whitespace-nowrap transition-colors border ${
                                        activeTab === cat
                                            ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 border-slate-900 dark:border-white'
                                            : 'bg-white dark:bg-slate-800 text-slate-500 hover:border-slate-400 border-slate-200 dark:border-slate-700'
                                    }`}
                                >
                                    {cat}
                                </button>
                            ))}
                        </div>

                        <div className="flex-1 overflow-y-auto mb-4 border border-slate-200 dark:border-slate-700 rounded-xl divide-y divide-slate-100 dark:divide-slate-800 bg-slate-50 dark:bg-slate-900/50">
                            {filteredParts.length === 0 ? (
                                <p className="text-center text-sm text-slate-500 py-6">결과가 없습니다.</p>
                            ) : (
                                filteredParts.map(p => {
                                    const catColor = CATEGORY_COLORS[p.category] || 'bg-slate-100 text-slate-600'
                                    const isSelected = !!selectedParts[p.id]
                                    const currentQty = selectedParts[p.id] || 1

                                    return (
                                        <div
                                            key={p.id}
                                            onClick={() => togglePart(p.id)}
                                            className={`w-full text-left px-4 py-3 flex items-center justify-between transition-colors cursor-pointer ${
                                                isSelected ? 'bg-indigo-50 dark:bg-indigo-500/20' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
                                            }`}
                                        >
                                            <div className="min-w-0 pr-3 flex items-center gap-3">
                                                <div className={`w-5 h-5 rounded-md border flex items-center justify-center shrink-0 transition-colors ${
                                                    isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800'
                                                }`}>
                                                    {isSelected && <Check className="w-3.5 h-3.5 text-white" />}
                                                </div>
                                                <div>
                                                    <div className="flex items-center gap-2 mb-1">
                                                        <span className={`text-[10px] sm:text-xs font-bold px-1.5 py-0.5 rounded ${catColor}`}>
                                                            {p.category}
                                                        </span>
                                                        <p className={`text-[13px] sm:text-sm font-bold truncate ${isSelected ? 'text-indigo-800 dark:text-indigo-200' : 'text-slate-800 dark:text-slate-200'}`}>
                                                            {p.name}
                                                        </p>
                                                    </div>
                                                    <p className="text-[11px] sm:text-xs text-slate-400 truncate">{p.articleNo}</p>
                                                </div>
                                            </div>
                                            
                                            <div onClick={(e) => isSelected ? e.stopPropagation() : null}>
                                                {isSelected ? (
                                                    <div className="flex items-center gap-2 border border-indigo-200 dark:border-indigo-500/50 rounded-lg bg-white dark:bg-slate-800 shadow-sm shrink-0 p-0.5">
                                                        <button 
                                                            onClick={(e) => updateQty(e, p.id, -1)}
                                                            className="w-7 h-7 flex items-center justify-center font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                                                        >-</button>
                                                        <span className="w-6 text-center font-black text-sm text-indigo-700 dark:text-indigo-300">{currentQty}</span>
                                                        <button 
                                                            onClick={(e) => updateQty(e, p.id, 1)}
                                                            className="w-7 h-7 flex items-center justify-center font-bold text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400 rounded transition-colors"
                                                        >+</button>
                                                    </div>
                                                ) : (
                                                    <div className="text-right shrink-0">
                                                        <span className="text-[10px] text-slate-400 block mb-0.5">재고</span>
                                                        <p className={`text-sm font-black leading-none ${p.stock <= p.lowStockThreshold ? 'text-red-500' : 'text-emerald-600'}`}>
                                                            {p.stock}
                                                        </p>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                    )
                                })
                            )}
                        </div>

                        {selectedCount > 0 && (
                            <div className="flex items-center gap-3 mt-auto pt-4 shrink-0 border-t border-slate-200 dark:border-slate-700">
                                <div className="text-sm font-bold text-slate-600 dark:text-slate-400 shrink-0">
                                    <span className="text-indigo-600 dark:text-indigo-400 text-lg font-black">{selectedCount}</span>개 품목
                                </div>
                                <button
                                    onClick={handleBatchAdd}
                                    disabled={isPending}
                                    className="flex-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold h-11 rounded-xl transition-colors disabled:opacity-50"
                                >
                                    {isPending ? '처리중...' : '일괄 차감 및 연동'}
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    )
}
