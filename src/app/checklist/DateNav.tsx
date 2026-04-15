'use client'

import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, CalendarDays } from 'lucide-react'
import { useState } from 'react'

function formatDate(d: Date) {
  const yyyy = d.getFullYear()
  const mm = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${yyyy}-${mm}-${dd}`
}

function parseDate(str: string | null): Date {
  if (!str) return getTodayLocal()
  const d = new Date(str + 'T00:00:00')
  return isNaN(d.getTime()) ? getTodayLocal() : d
}

function getTodayLocal(): Date {
  const now = new Date()
  return new Date(now.getFullYear(), now.getMonth(), now.getDate())
}

export function DateNav({ dateStr }: { dateStr: string }) {
  const router = useRouter()
  const [showPicker, setShowPicker] = useState(false)

  const current = parseDate(dateStr)
  const today = getTodayLocal()

  const isToday = formatDate(current) === formatDate(today)

  const prev = new Date(current)
  prev.setDate(prev.getDate() - 1)
  const prevStr = formatDate(prev)

  const next = new Date(current)
  next.setDate(next.getDate() + 1)
  const nextStr = formatDate(next)
  const canGoNext = next <= today

  const goToDate = (value: string) => {
    setShowPicker(false)
    if (!value) return
    const picked = new Date(value + 'T00:00:00')
    if (picked > today) return
    router.push(`/checklist?date=${value}`)
    router.refresh()
  }

  const label = isToday
    ? '오늘'
    : current.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric', weekday: 'short' })

  return (
    <div className="flex items-center gap-2 relative">
      {/* 이전 날 */}
      <Link
        href={`/checklist?date=${prevStr}`}
        className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer touch-manipulation"
        title="이전 날"
      >
        <ChevronLeft className="w-4 h-4" />
      </Link>

      {/* 날짜 표시 + 달력 피커 */}
      <div className="relative">
        <button
          onClick={() => setShowPicker((v) => !v)}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent rounded-lg transition-colors cursor-pointer touch-manipulation"
          title="날짜 선택"
        >
          <CalendarDays className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-slate-900 dark:text-white font-bold text-sm">{label}</span>
          {!isToday && (
            <button
              onClick={(e) => {
                e.stopPropagation()
                router.push('/checklist')
                router.refresh()
              }}
              className="ml-1 text-xs text-blue-400 hover:text-blue-300 font-medium"
            >
              오늘로
            </button>
          )}
        </button>

        {showPicker && (
          <div className="absolute top-full mt-2 left-1/2 -translate-x-1/2 z-50 bg-white dark:bg-slate-800 rounded-xl shadow-xl p-3 border border-slate-200 dark:border-slate-700">
            <p className="text-slate-500 dark:text-slate-400 text-xs mb-2 text-center">날짜 선택</p>
            <input
              type="date"
              defaultValue={formatDate(current)}
              max={formatDate(today)}
              onChange={(e) => goToDate(e.target.value)}
              className="bg-slate-50 dark:bg-slate-700 text-slate-900 dark:text-white rounded-lg px-3 py-2 text-sm border border-slate-300 dark:border-slate-600 focus:outline-none focus:border-blue-500 cursor-pointer"
            />
          </div>
        )}
      </div>

      {/* 다음 날 */}
      {canGoNext ? (
        <Link
          href={`/checklist?date=${nextStr}`}
          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 border border-slate-200 dark:border-transparent text-slate-600 dark:text-slate-300 hover:text-slate-900 dark:hover:text-white transition-colors cursor-pointer touch-manipulation"
          title="다음 날"
        >
          <ChevronRight className="w-4 h-4" />
        </Link>
      ) : (
        <button
          disabled
          className="p-1.5 rounded-lg bg-white dark:bg-slate-800 text-slate-300 transition-colors opacity-40 cursor-not-allowed border border-slate-200 dark:border-transparent"
          title="다음 날"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}
    </div>
  )
}
