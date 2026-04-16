'use client'

import { useState, useTransition, useEffect, useCallback } from 'react'
import { createDelivery, updateDelivery, deleteDelivery } from '@/app/actions'
import { ChevronLeft, ChevronRight, Plus, X, Pencil, Trash2, Package, MapPin, User, CalendarDays, CheckCircle2, Clock, XCircle, List } from 'lucide-react'

interface Delivery {
    id: number
    date: string
    productName: string
    destination: string
    quantity: number
    memo: string | null
    performedBy: string
    status: string
}

const WEEKDAYS = ['일', '월', '화', '수', '목', '금', '토']

const STATUS_CONFIG: Record<string, { label: string; icon: React.ReactNode; badge: string; dot: string }> = {
    '예정': {
        label: '예정',
        icon: <Clock className="w-3 h-3" />,
        badge: 'bg-blue-100 text-blue-700 border border-blue-200',
        dot: 'bg-blue-500',
    },
    '완료': {
        label: '완료',
        icon: <CheckCircle2 className="w-3 h-3" />,
        badge: 'bg-emerald-100 text-emerald-700 border border-emerald-200',
        dot: 'bg-emerald-500',
    },
    '취소': {
        label: '취소',
        icon: <XCircle className="w-3 h-3" />,
        badge: 'bg-slate-100 text-slate-500 border border-slate-200',
        dot: 'bg-slate-400',
    },
}

function toLocalDateString(date: Date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

function DeliveryBadge({ delivery, onClick }: { delivery: Delivery; onClick: () => void }) {
    const cfg = STATUS_CONFIG[delivery.status] || STATUS_CONFIG['예정']
    return (
        <button
            onClick={(e) => { e.stopPropagation(); onClick() }}
            className={`w-full text-left text-xs px-2 py-1 rounded-md truncate flex items-center gap-1 font-medium ${cfg.badge} hover:opacity-80 transition-opacity`}
        >
            <span className={`shrink-0 w-2 h-2 rounded-full ${cfg.dot}`} />
            <span className="truncate">{delivery.destination}</span>
        </button>
    )
}

interface ModalProps {
    initial?: Partial<Delivery> & { date?: string }
    onClose: () => void
    employees: string[]
}
function DeliveryModal({ initial, onClose, employees }: ModalProps) {
    const isEdit = !!initial?.id
    const [isPending, startTransition] = useTransition()
    const [error, setError] = useState('')

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault()
        setError('')
        const fd = new FormData(e.currentTarget)
        startTransition(async () => {
            try {
                if (isEdit) {
                    await updateDelivery(fd)
                } else {
                    await createDelivery(fd)
                }
                onClose()
            } catch (err: unknown) {
                setError(err instanceof Error ? err.message : '오류가 발생했습니다.')
            }
        })
    }

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg p-7" onClick={e => e.stopPropagation()}>
                <div className="flex items-center justify-between mb-5">
                    <h2 className="text-xl font-bold text-slate-900">{isEdit ? '납품 일정 수정' : '납품 일정 추가'}</h2>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-700"><X className="w-5 h-5" /></button>
                </div>

                <form onSubmit={handleSubmit} className="space-y-3">
                    {isEdit && <input type="hidden" name="id" value={initial?.id} />}

                    <div>
                        <label className="text-sm font-semibold text-slate-500 mb-1 block">납품 날짜</label>
                        <input
                            type="date"
                            name="date"
                            defaultValue={initial?.date?.slice(0, 10)}
                            required
                            className="w-full border border-slate-200 rounded-xl px-3 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">제품명</label>
                        <input
                            type="text"
                            name="productName"
                            defaultValue={initial?.productName}
                            required
                            placeholder="예: CP-3000 수중청소기"
                            className="w-full border border-slate-200 rounded-xl px-3 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">납품처</label>
                        <input
                            type="text"
                            name="destination"
                            defaultValue={initial?.destination}
                            required
                            placeholder="예: 서울 강서구청 수영장"
                            className="w-full border border-slate-200 rounded-xl px-3 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">수량</label>
                            <input
                                type="number"
                                name="quantity"
                                defaultValue={initial?.quantity ?? 1}
                                min={1}
                                required
                                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                            />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 mb-1 block">상태</label>
                            <select
                                name="status"
                                defaultValue={initial?.status ?? '예정'}
                                className="w-full border border-slate-200 rounded-xl px-3 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                            >
                                <option value="예정">예정</option>
                                <option value="완료">완료</option>
                                <option value="취소">취소</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">담당자</label>
                        <input
                            type="text"
                            name="performedBy"
                            defaultValue={initial?.performedBy}
                            placeholder="담당자 이름"
                            list="employee-list"
                            className="w-full border border-slate-200 rounded-xl px-3 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500"
                        />
                        <datalist id="employee-list">
                            {employees.map(e => <option key={e} value={e} />)}
                        </datalist>
                    </div>

                    <div>
                        <label className="text-xs font-semibold text-slate-500 mb-1 block">메모</label>
                        <textarea
                            name="memo"
                            defaultValue={initial?.memo ?? ''}
                            rows={2}
                            placeholder="특이사항, 설치 조건 등..."
                            className="w-full border border-slate-200 rounded-xl px-3 py-3 text-base outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                    </div>

                    {error && <p className="text-sm text-red-500 font-medium">{error}</p>}

                    <div className="flex gap-2 pt-2">
                        <button type="button" onClick={onClose} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-base font-semibold hover:bg-slate-50 transition-colors">
                            취소
                        </button>
                        <button
                            type="submit"
                            disabled={isPending}
                            className="flex-1 py-3 rounded-xl bg-blue-600 text-white text-base font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                        >
                            {isPending ? '저장 중...' : isEdit ? '수정 완료' : '일정 추가'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}

interface DetailPanelProps {
    date: Date
    deliveries: Delivery[]
    onAdd: () => void
    onEdit: (d: Delivery) => void
    onDelete: (d: Delivery) => void
    onClose: () => void
}
function DetailPanel({ date, deliveries, onAdd, onEdit, onDelete, onClose }: DetailPanelProps) {
    const dayNames = ['일요일', '월요일', '화요일', '수요일', '목요일', '금요일', '토요일']
    const heading = `${date.getMonth() + 1}월 ${date.getDate()}일 (${dayNames[date.getDay()]})`

    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
            <div className="flex items-center justify-between mb-4">
                <h3 className="font-bold text-lg text-slate-900 flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-blue-600" />
                    {heading}
                </h3>
                <div className="flex items-center gap-2">
                    <button
                        onClick={onAdd}
                        className="flex items-center gap-1.5 bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        <Plus className="w-3.5 h-3.5" /> 추가
                    </button>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600">
                        <X className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {deliveries.length === 0 ? (
                <div className="text-center py-8 text-slate-400">
                    <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                    <p className="text-sm">이 날의 납품 일정이 없습니다.</p>
                    <button
                        onClick={onAdd}
                        className="mt-3 text-blue-600 text-xs font-medium hover:underline"
                    >
                        + 납품 일정 추가하기
                    </button>
                </div>
            ) : (
                <div className="space-y-3">
                    {deliveries.map(d => {
                        const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG['예정']
                        return (
                            <div key={d.id} className="border border-slate-100 rounded-xl p-4 hover:border-slate-200 transition-colors">
                                <div className="flex items-start justify-between gap-2 mb-2">
                                    <div className="flex-1 min-w-0">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className={`inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                                                {cfg.icon} {cfg.label}
                                            </span>
                                            <span className="text-sm text-slate-400">×{d.quantity}</span>
                                        </div>
                                        <p className="font-bold text-base text-slate-900 truncate">{d.productName}</p>
                                    </div>
                                    <div className="flex gap-1 shrink-0">
                                        <button
                                            onClick={() => onEdit(d)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-blue-600 hover:bg-blue-50 transition-colors"
                                        >
                                            <Pencil className="w-3.5 h-3.5" />
                                        </button>
                                        <button
                                            onClick={() => onDelete(d)}
                                            className="p-1.5 rounded-lg text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors"
                                        >
                                            <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-1">
                                    <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                        <MapPin className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                        <span className="truncate">{d.destination}</span>
                                    </div>
                                    {d.performedBy && (
                                        <div className="flex items-center gap-1.5 text-sm text-slate-500">
                                            <User className="w-3.5 h-3.5 shrink-0 text-slate-400" />
                                            <span>{d.performedBy}</span>
                                        </div>
                                    )}
                                    {d.memo && (
                                        <p className="text-sm text-slate-400 mt-1.5 pl-4">{d.memo}</p>
                                    )}
                                </div>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

export function DeliveryCalendar({ employees }: { employees: string[] }) {
    const today = new Date()
    const [currentYear, setCurrentYear] = useState(today.getFullYear())
    const [currentMonth, setCurrentMonth] = useState(today.getMonth() + 1)
    const [deliveries, setDeliveries] = useState<Delivery[]>([])
    const [loading, setLoading] = useState(false)

    const [selectedDate, setSelectedDate] = useState<Date | null>(null)
    const [modalOpen, setModalOpen] = useState(false)
    const [editTarget, setEditTarget] = useState<Delivery | null>(null)
    const [defaultDate, setDefaultDate] = useState<string | undefined>()
    const [deleteConfirm, setDeleteConfirm] = useState<Delivery | null>(null)
    const [deleteTransition, startDeleteTransition] = useTransition()

    const fetchDeliveries = useCallback(async () => {
        setLoading(true)
        try {
            const res = await fetch(`/api/deliveries?year=${currentYear}&month=${currentMonth}`)
            const data = await res.json()
            setDeliveries(data.deliveries || [])
        } catch {
            // silently fail
        } finally {
            setLoading(false)
        }
    }, [currentYear, currentMonth])

    useEffect(() => {
        fetchDeliveries()
    }, [fetchDeliveries])

    // Refresh after actions
    const handleModalClose = () => {
        setModalOpen(false)
        setEditTarget(null)
        fetchDeliveries()
    }

    // Build calendar grid
    const firstDay = new Date(currentYear, currentMonth - 1, 1)
    const daysInMonth = new Date(currentYear, currentMonth, 0).getDate()
    const startWeekDay = firstDay.getDay() // 0=Sun

    const calendarCells: (Date | null)[] = [
        ...Array(startWeekDay).fill(null),
        ...Array.from({ length: daysInMonth }, (_, i) => new Date(currentYear, currentMonth - 1, i + 1))
    ]
    // Pad to complete last row
    while (calendarCells.length % 7 !== 0) calendarCells.push(null)

    const deliveriesMap: Record<string, Delivery[]> = {}
    for (const d of deliveries) {
        const key = toLocalDateString(new Date(d.date))
        if (!deliveriesMap[key]) deliveriesMap[key] = []
        deliveriesMap[key].push(d)
    }

    const prevMonth = () => {
        if (currentMonth === 1) { setCurrentYear(y => y - 1); setCurrentMonth(12) }
        else setCurrentMonth(m => m - 1)
        setSelectedDate(null)
    }
    const nextMonth = () => {
        if (currentMonth === 12) { setCurrentYear(y => y + 1); setCurrentMonth(1) }
        else setCurrentMonth(m => m + 1)
        setSelectedDate(null)
    }

    const todayKey = toLocalDateString(today)
    const selectedKey = selectedDate ? toLocalDateString(selectedDate) : null
    const selectedDeliveries = selectedKey ? (deliveriesMap[selectedKey] || []) : []

    const openAdd = (date?: Date) => {
        setEditTarget(null)
        setDefaultDate(date ? toLocalDateString(date) : undefined)
        setModalOpen(true)
    }

    const openEdit = (d: Delivery) => {
        setEditTarget(d)
        setModalOpen(true)
    }

    const handleDelete = (d: Delivery) => {
        setDeleteConfirm(d)
    }

    const confirmDelete = () => {
        if (!deleteConfirm) return
        const fd = new FormData()
        fd.append('id', String(deleteConfirm.id))
        startDeleteTransition(async () => {
            await deleteDelivery(fd)
            setDeleteConfirm(null)
            fetchDeliveries()
        })
    }

    // Summary stats
    const totalThisMonth = deliveries.length
    const planned = deliveries.filter(d => d.status === '예정').length
    const completed = deliveries.filter(d => d.status === '완료').length

    // 통계 카드 클릭 필터
    const [statFilter, setStatFilter] = useState<'전체' | '예정' | '완료' | null>(null)

    const filteredByStatList = statFilter === null ? [] :
        statFilter === '전체' ? [...deliveries].sort((a, b) => a.date.localeCompare(b.date)) :
            [...deliveries].filter(d => d.status === statFilter).sort((a, b) => a.date.localeCompare(b.date))

    return (
        <div className="space-y-6">
            {/* Stats */}
            <div className="grid grid-cols-3 gap-3">
                {[
                    { label: '이번 달 전체', key: '전체' as const, value: totalThisMonth, color: 'text-slate-900', bg: 'bg-white', activeBg: 'bg-slate-900', activeText: 'text-white' },
                    { label: '예정', key: '예정' as const, value: planned, color: 'text-blue-600', bg: 'bg-blue-50', activeBg: 'bg-blue-600', activeText: 'text-white' },
                    { label: '완료', key: '완료' as const, value: completed, color: 'text-emerald-600', bg: 'bg-emerald-50', activeBg: 'bg-emerald-600', activeText: 'text-white' },
                ].map(s => {
                    const isActive = statFilter === s.key
                    return (
                        <button
                            key={s.label}
                            onClick={() => setStatFilter(prev => prev === s.key ? null : s.key)}
                            className={`${isActive ? `${s.activeBg} shadow-md` : `${s.bg} hover:shadow-sm`} rounded-xl p-5 border border-slate-100 text-center transition-all duration-150 cursor-pointer w-full`}
                        >
                            <p className={`text-3xl font-bold ${isActive ? s.activeText : s.color}`}>{s.value}</p>
                            <p className={`text-sm mt-1 flex items-center justify-center gap-1 ${isActive ? 'text-white/80' : 'text-slate-500'}`}>
                                <List className="w-3.5 h-3.5" />{s.label}
                            </p>
                        </button>
                    )
                })}
            </div>

            {/* Stat filter list panel */}
            {statFilter !== null && (
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <h3 className="font-bold text-base text-slate-900 flex items-center gap-2">
                            <CalendarDays className="w-4 h-4 text-blue-600" />
                            {currentYear}년 {currentMonth}월 &mdash; {statFilter === '전체' ? '전체 변동' : statFilter === '예정' ? '납품 예정' : '납품 완료'}
                            <span className="text-sm font-normal text-slate-400">({filteredByStatList.length}건)</span>
                        </h3>
                        <button onClick={() => setStatFilter(null)} className="text-slate-400 hover:text-slate-700">
                            <X className="w-4 h-4" />
                        </button>
                    </div>
                    {filteredByStatList.length === 0 ? (
                        <div className="text-center py-10 text-slate-400">
                            <Package className="w-8 h-8 mx-auto mb-2 opacity-40" />
                            <p className="text-sm">해당 내역이 없습니다.</p>
                        </div>
                    ) : (
                        <div className="divide-y divide-slate-100">
                            {filteredByStatList.map(d => {
                                const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG['예정']
                                return (
                                    <div key={d.id} className="flex items-center gap-3 px-5 py-3.5 hover:bg-slate-50 transition-colors">
                                        {/* Date */}
                                        <div className="shrink-0 w-16 text-center">
                                            <p className="text-xs font-bold text-slate-500">{d.date.slice(5, 10).replace('-', '/')}</p>
                                        </div>
                                        {/* Status badge */}
                                        <span className={`shrink-0 inline-flex items-center gap-1 text-xs font-bold px-2 py-0.5 rounded-full ${cfg.badge}`}>
                                            {cfg.icon}{cfg.label}
                                        </span>
                                        {/* Info */}
                                        <div className="flex-1 min-w-0">
                                            <p className="font-semibold text-sm text-slate-900 truncate">{d.productName}
                                                <span className="font-normal text-slate-400 ml-1">×{d.quantity}</span>
                                            </p>
                                            <div className="flex items-center gap-3 mt-0.5">
                                                <span className="flex items-center gap-1 text-xs text-slate-500">
                                                    <MapPin className="w-3 h-3" />{d.destination}
                                                </span>
                                                {d.performedBy && (
                                                    <span className="flex items-center gap-1 text-xs text-slate-400">
                                                        <User className="w-3 h-3" />{d.performedBy}
                                                    </span>
                                                )}
                                            </div>
                                        </div>
                                        {/* Actions */}
                                        <div className="flex gap-1 shrink-0">
                                            <button
                                                onClick={() => openEdit(d)}
                                                className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                                            >
                                                <Pencil className="w-3.5 h-3.5" />
                                            </button>
                                            <button
                                                onClick={() => setDeleteConfirm(d)}
                                                className="p-1.5 text-slate-400 hover:text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                                            >
                                                <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                        </div>
                                    </div>
                                )
                            })}
                        </div>
                    )}
                </div>
            )}

            <div className="grid grid-cols-1 lg:grid-cols-[1fr_440px] gap-6">
                {/* Calendar */}
                <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
                    {/* Header */}
                    <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
                        <button onClick={prevMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
                            <ChevronLeft className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold text-slate-900">
                            {currentYear}년 {currentMonth}월
                        </h2>
                        <div className="flex items-center gap-2">
                            {loading && <span className="text-xs text-slate-400">로딩 중...</span>}
                            <button onClick={nextMonth} className="p-1.5 rounded-lg hover:bg-slate-100 transition-colors text-slate-500">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Weekday headers */}
                    <div className="grid grid-cols-7 border-b border-slate-100">
                        {WEEKDAYS.map((day, i) => (
                            <div key={day} className={`text-center text-sm font-bold py-2.5 ${i === 0 ? 'text-red-400' : i === 6 ? 'text-blue-500' : 'text-slate-500'}`}>
                                {day}
                            </div>
                        ))}
                    </div>

                    {/* Day cells */}
                    <div className="grid grid-cols-7">
                        {calendarCells.map((date, idx) => {
                            if (!date) {
                                return <div key={`empty-${idx}`} className="border-b border-r border-slate-100 min-h-[60px] sm:min-h-[130px]" />
                            }

                            const key = toLocalDateString(date)
                            const dayDeliveries = deliveriesMap[key] || []
                            const isToday = key === todayKey
                            const isSelected = key === selectedKey
                            const isWeekend = date.getDay() === 0 || date.getDay() === 6
                            const isSunday = date.getDay() === 0

                            return (
                                <div
                                    key={key}
                                    onClick={() => setSelectedDate(d => d && toLocalDateString(d) === key ? null : date)}
                                    className={`relative border-b border-r border-slate-100 min-h-[60px] sm:min-h-[130px] p-1 sm:p-2 cursor-pointer transition-all
                                        ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'hover:bg-slate-50'}
                                    `}
                                >
                                    <div className={`text-xs sm:text-base font-bold w-6 h-6 sm:w-8 sm:h-8 flex items-center justify-center rounded-full mb-0.5 sm:mb-1
                                        ${isToday ? 'bg-blue-600 text-white' : isSunday ? 'text-red-400' : isWeekend ? 'text-blue-500' : 'text-slate-700'}`}
                                    >
                                        {date.getDate()}
                                    </div>
                                    {/* Mobile: colored dots per delivery. Desktop: full badges */}
                                    <div className="flex flex-wrap gap-0.5 sm:hidden">
                                        {dayDeliveries.slice(0, 5).map(d => {
                                            const cfg = STATUS_CONFIG[d.status] || STATUS_CONFIG['예정']
                                            return <span key={d.id} className={`w-1.5 h-1.5 rounded-full ${cfg.dot}`} />
                                        })}
                                        {dayDeliveries.length > 5 && <span className="text-[9px] leading-none text-slate-400">+{dayDeliveries.length - 5}</span>}
                                    </div>
                                    <div className="hidden sm:block space-y-0.5">
                                        {dayDeliveries.slice(0, 3).map(d => (
                                            <DeliveryBadge key={d.id} delivery={d} onClick={() => openEdit(d)} />
                                        ))}
                                        {dayDeliveries.length > 3 && (
                                            <p className="text-xs text-slate-400 text-right pr-0.5">+{dayDeliveries.length - 3}건</p>
                                        )}
                                    </div>
                                </div>
                            )
                        })}
                    </div>
                </div>

                {/* Right panel */}
                <div>
                    {selectedDate ? (
                        <DetailPanel
                            date={selectedDate}
                            deliveries={selectedDeliveries}
                            onAdd={() => openAdd(selectedDate)}
                            onEdit={openEdit}
                            onDelete={handleDelete}
                            onClose={() => setSelectedDate(null)}
                        />
                    ) : (
                        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-5 text-center">
                            <CalendarDays className="w-10 h-10 mx-auto mb-3 text-slate-300" />
                            <p className="text-base text-slate-500 mb-1 font-medium">날짜를 클릭하면</p>
                            <p className="text-base text-slate-400">납품 일정을 확인하고 추가할 수 있습니다.</p>
                            <button
                                onClick={() => openAdd()}
                                className="mt-4 flex items-center gap-2 bg-blue-600 text-white text-sm font-bold px-4 py-2 rounded-xl hover:bg-blue-700 transition-colors mx-auto"
                            >
                                <Plus className="w-4 h-4" /> 납품 추가
                            </button>
                        </div>
                    )}

                    {/* Legend */}
                    <div className="mt-4 bg-white rounded-2xl border border-slate-200 shadow-sm p-4">
                        <p className="text-sm font-bold text-slate-500 mb-3">범례</p>
                        <div className="space-y-2">
                            {Object.entries(STATUS_CONFIG).map(([key, cfg]) => (
                                <div key={key} className="flex items-center gap-2">
                                    <span className={`w-2.5 h-2.5 rounded-full ${cfg.dot}`} />
                                    <span className="text-sm text-slate-600">{cfg.label}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>

            {/* Add/Edit Modal */}
            {modalOpen && (
                <DeliveryModal
                    initial={editTarget ? {
                        ...editTarget,
                        date: new Date(editTarget.date).toISOString(),
                    } : {
                        date: defaultDate,
                        status: '예정',
                    }}
                    onClose={handleModalClose}
                    employees={employees}
                />
            )}

            {/* Delete confirm dialog */}
            {deleteConfirm && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={() => setDeleteConfirm(null)}>
                    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-sm p-6" onClick={e => e.stopPropagation()}>
                        <h3 className="font-bold text-lg text-slate-900 mb-2">납품 일정 삭제</h3>
                        <p className="text-base text-slate-500 mb-1">
                            <span className="font-semibold text-slate-700">{deleteConfirm.productName}</span> →{' '}
                            {deleteConfirm.destination}
                        </p>
                        <p className="text-base text-slate-400 mb-5">이 일정을 삭제하시겠습니까? 되돌릴 수 없습니다.</p>
                        <div className="flex gap-2">
                            <button onClick={() => setDeleteConfirm(null)} className="flex-1 py-3 rounded-xl border border-slate-200 text-slate-600 text-base font-semibold hover:bg-slate-50">
                                취소
                            </button>
                            <button
                                onClick={confirmDelete}
                                disabled={deleteTransition}
                                className="flex-1 py-3 rounded-xl bg-red-500 text-white text-base font-semibold hover:bg-red-600 transition-colors disabled:opacity-50"
                            >
                                {deleteTransition ? '삭제 중...' : '삭제'}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
