'use client'

import { useState, useTransition } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, Truck, Building2, ChevronRight, Trash2, Loader2, XCircle, MinusCircle, ArrowRight } from 'lucide-react'
import { deleteWorkChecklist, moveToTodayWorkChecklist } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { ChecklistPartSelector } from './ChecklistPartSelector'

const CRM_LABELS = [
  { key: 'crmUpdated', label: '고객관리 업데이트', emoji: '📋' },
  { key: 'quoteSent', label: '견적서 발송', emoji: '📄' },
  { key: 'photosAttached', label: '사진 첨부', emoji: '📸' },
  { key: 'paymentUpdated', label: '결재현황 업데이트', emoji: '💳' },
  { key: 'naverWorksLogged', label: '네이버 웍스 기록', emoji: '📝' },
]

const DELIVERY_CRM_LABELS = [
  { key: 'crmUpdated', label: '고객관리 업데이트', emoji: '📋' },
  { key: 'quoteSent', label: '견적서 발송', emoji: '📄' },
  { key: 'photosAttached', label: '사진 첨부', emoji: '📸' },
  { key: 'paymentUpdated', label: '결재현황 업데이트', emoji: '💳' },
  { key: 'naverWorksLogged', label: '네이버 웍스 기록', emoji: '📝' },
]

const CARRIERS = ['로젠', '경동', '대신', '기타', '미정']

// true = 완료 / null = 아직 못 했어요 / false = 해당없음
type TriState = true | null | false

function isHandled(v: TriState): boolean {
  return v === true || v === false
}

function StateButtons({
  value,
  loading = false,
  onSet,
}: {
  value: TriState
  loading?: boolean
  onSet: (v: TriState) => void
}) {
  const base = 'flex-1 py-1.5 sm:py-2 text-xs font-bold rounded-lg transition-all border disabled:opacity-50 disabled:cursor-wait'
  return (
    <div className="flex gap-1.5">
      <button
        disabled={loading}
        onClick={() => onSet(true)}
        className={`${base} ${
          value === true
            ? 'bg-emerald-100 dark:bg-emerald-500/25 border-emerald-400 dark:border-emerald-500/50 text-emerald-700 dark:text-emerald-300'
            : 'bg-slate-50 dark:bg-slate-700/40 border-slate-300 dark:border-slate-600/30 text-slate-600 dark:text-slate-400 hover:border-emerald-400 dark:hover:border-emerald-500/40 hover:text-emerald-600 dark:hover:text-emerald-400'
        }`}
      >
        ✓ 완료했어요
      </button>
      <button
        disabled={loading}
        onClick={() => onSet(null)}
        className={`${base} ${
          value === null
            ? 'bg-amber-100 dark:bg-amber-500/25 border-amber-400 dark:border-amber-500/50 text-amber-700 dark:text-amber-300'
            : 'bg-slate-50 dark:bg-slate-700/40 border-slate-300 dark:border-slate-600/30 text-slate-600 dark:text-slate-400 hover:border-amber-400 dark:hover:border-amber-500/40 hover:text-amber-600 dark:hover:text-amber-400'
        }`}
      >
        ⏳ 못 했어요
      </button>
      <button
        disabled={loading}
        onClick={() => onSet(false)}
        className={`${base} ${
          value === false
            ? 'bg-slate-200 dark:bg-slate-500/30 border-slate-400 dark:border-slate-400/40 text-slate-700 dark:text-slate-300'
            : 'bg-slate-50 dark:bg-slate-700/40 border-slate-300 dark:border-slate-600/30 text-slate-600 dark:text-slate-400 hover:border-slate-400/40 hover:text-slate-700 dark:hover:text-slate-300'
        }`}
      >
        — 해당없어요
      </button>
    </div>
  )
}

function normalizeTriState(raw: boolean | null | undefined): TriState {
  if (raw === true) return true
  if (raw === false) return false
  return null
}

export function ChecklistCard({ item: initialItem, parts = [], done: initialDone = false }: { item: any; parts?: any[]; done?: boolean }) {
  const router = useRouter()
  const [item, setItem] = useState(initialItem)
  const [, startTransition] = useTransition()

  const done = initialDone || item.completed

  const time = new Date(item.createdAt).toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' })
  
  // Use Asia/Seoul on both Server and Client to avoid Hydration Mismatch
  const itemDateStr = new Date(item.createdAt).toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
  const todayStr = new Date().toLocaleDateString('ko-KR', { timeZone: 'Asia/Seoul' })
  const isPast = itemDateStr !== todayStr && new Date(item.createdAt).getTime() < new Date().getTime()

  const setField = (field: string, value: TriState) => {
    if (item[field] === value) return; // 중복 클릭 무시

    const previousItem = { ...item }
    const updatedItem = { ...item, [field]: value }

    // Client-side optimistic evaluation of 'completed'
    let crmHandled = true
    if (updatedItem.hasCrmUpdate) {
        let keys = [...CRM_LABELS.map(l => l.key)]
        if (updatedItem.crmType === 'NEW') keys.push('poolInfoUpdated')
        crmHandled = keys.every(k => isHandled(updatedItem[k]))
    } else if (updatedItem.hasDelivery) {
        const DELIVERY_CRM_KEYS = ['crmUpdated', 'quoteSent', 'photosAttached', 'paymentUpdated', 'naverWorksLogged']
        crmHandled = DELIVERY_CRM_KEYS.every(k => isHandled(updatedItem[k]))
    }
    const deliveryHandled = updatedItem.hasDelivery ? isHandled(updatedItem.deliverySent) : true
    updatedItem.completed = crmHandled && deliveryHandled

    setItem(updatedItem)

    const fd = new FormData()
    fd.append('id', String(item.id))
    fd.append(field, value === null ? 'null' : String(value))

    fetch('/api/checklist', { method: 'PATCH', body: fd })
      .then(res => {
        if (!res.ok) throw new Error('Update failed')
        startTransition(() => {
          router.refresh()
        })
      })
      .catch(err => {
        setItem(previousItem)
        alert('상태 업데이트에 실패했습니다. 다시 시도해주세요.')
      })
  }

  const saveTextOnBlur = (field: string, text: string) => {
    const fd = new FormData()
    fd.append('id', String(item.id))
    fd.append(field, text)

    fetch('/api/checklist', { method: 'PATCH', body: fd })
      .then(res => {
        if (!res.ok) throw new Error('Update failed')
        startTransition(() => {
          router.refresh()
        })
      })
      .catch(err => {
        alert('텍스트 저장에 실패했습니다. 다시 시도해주세요.')
      })
  }

  const activeCrmLabels = item.hasCrmUpdate ? [...CRM_LABELS] : (item.hasDelivery ? [...DELIVERY_CRM_LABELS] : [])
  if (item.hasCrmUpdate && item.crmType === 'NEW') {
      const idx = activeCrmLabels.findIndex(l => l.key === 'crmUpdated');
      const insertIdx = idx !== -1 ? idx + 1 : 1;
      activeCrmLabels.splice(insertIdx, 0, {
          key: 'poolInfoUpdated',
          label: '풀장 정보와 기계 serial No. 를 기입했는지?',
          emoji: '📋'
      });
  }

  const crmItems = activeCrmLabels.map(({ key, label, emoji }) => {
    return {
      key, label, emoji,
      value: normalizeTriState(item[key]),
    }
  })

  const crmHandled = crmItems.filter(c => isHandled(c.value)).length
  const crmPending = crmItems.filter(c => c.value === null).length

  const deliveryValue = item.hasDelivery ? normalizeTriState(item.deliverySent) : null

  // 택배 발송 섹션의 아이템 개수 및 상태 계산 (운송장 접수 포함)
  const deliverySectionTotal = item.hasDelivery ? (item.hasCrmUpdate ? 1 : 1 + DELIVERY_CRM_LABELS.length) : 0;
  let deliverySectionHandled = 0;
  let deliverySectionPending = 0;
  
  if (item.hasDelivery) {
    if (isHandled(deliveryValue)) deliverySectionHandled++;
    if (deliveryValue === null) deliverySectionPending++;
    
    if (!item.hasCrmUpdate) {
      deliverySectionHandled += crmHandled;
      deliverySectionPending += crmPending;
    }
  }

  return (
    <div className={`rounded-2xl border p-4 sm:p-5 transition-all ${
      done
        ? 'border-slate-300 dark:border-slate-700/60 bg-slate-100 dark:bg-slate-900/40'
        : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/80 shadow-lg shadow-black/5 dark:shadow-black/20'
    }`}>

      {/* 카드 헤더 */}
      <div className="flex items-start justify-between mb-3.5 sm:mb-4">
        <div className="flex items-center gap-2">
          {done
            ? <CheckCircle2 className="w-5 h-5 sm:w-6 sm:h-6 text-emerald-400 flex-shrink-0" />
            : <Clock className="w-5 h-5 sm:w-6 sm:h-6 text-amber-400 flex-shrink-0" />
          }
          <span className="text-slate-900 dark:text-white font-black text-lg sm:text-xl">{item.companyName}</span>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 ml-2">
          {(!done && isPast) && (
            <button
              onClick={() => {
                startTransition(async () => {
                  const fd = new FormData()
                  fd.append('id', String(item.id))
                  await moveToTodayWorkChecklist(fd)
                })
              }}
              className="flex items-center gap-1 bg-blue-50 dark:bg-blue-500/10 text-blue-600 dark:text-blue-400 hover:bg-blue-100 dark:hover:bg-blue-500/20 transition-colors px-2 py-1 sm:px-3 sm:py-1.5 rounded-lg text-xs sm:text-sm font-bold"
              title="오늘 날짜로 이동"
            >
              <ArrowRight className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
              <span className="hidden sm:inline">오늘로</span> 이동
            </button>
          )}
          <span className="text-slate-400 text-sm sm:text-base">{time}</span>
          <button
            onClick={() => {
              startTransition(async () => {
                const fd = new FormData()
                fd.append('id', String(item.id))
                await deleteWorkChecklist(fd)
              })
            }}
            className="text-slate-600 hover:text-red-400 transition-colors"
            title="삭제"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* 택배 */}
      {item.hasDelivery && (
        <div className="mb-5 sm:mb-6">
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
              <span className="text-blue-400 text-sm sm:text-base font-bold">택배 발송</span>
            </div>
            {/* Delivery Progress */}
            <span className="text-sm sm:text-base text-slate-400 font-medium">
              {deliverySectionHandled}/{deliverySectionTotal} 처리
              {deliverySectionPending > 0 && <span className="text-amber-400 ml-1.5">({deliverySectionPending}개 미완)</span>}
            </span>
          </div>

          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/40 divide-y divide-slate-200 dark:divide-slate-700/30">


            {/* 발송 품목 입력 */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300 mb-1 sm:mb-0">발송 품목</p>
              <div className="w-full sm:w-[320px] flex-shrink-0">
                <input
                  type="text"
                  disabled={done}
                  value={item.deliveryItems || ''}
                  onChange={(e) => setItem({ ...item, deliveryItems: e.target.value })}
                  onBlur={(e) => saveTextOnBlur('deliveryItems', e.target.value)}
                  placeholder="예) CP-3 필터 1개 등"
                  className="w-full bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-700 text-sm text-slate-900 dark:text-white rounded-lg px-3 py-1.5 sm:py-2 outline-none focus:border-blue-500 transition-colors disabled:opacity-50"
                />
              </div>
            </div>

            {/* 운송장 접수 */}
            <div className="px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <span className="text-base sm:text-lg w-5 sm:w-6 text-center flex-shrink-0">📦</span>
                <span className={`text-sm font-semibold ${
                  deliveryValue === true ? 'text-emerald-600 dark:text-emerald-300 line-through decoration-emerald-600' :
                  deliveryValue === false ? 'text-slate-400 dark:text-slate-500 line-through decoration-slate-400 dark:decoration-slate-600' :
                  'text-slate-700 dark:text-slate-200'
                }`}>운송장 접수</span>
              </div>
              <div className="w-full sm:w-[320px] flex-shrink-0">
                <StateButtons value={deliveryValue} onSet={(v) => setField('deliverySent', v)} />
              </div>
            </div>

            {/* CRM Items for Delivery Only */}
            {!item.hasCrmUpdate && crmItems.map(({ key, label, emoji, value }) => (
              <div key={key} className="px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg w-5 sm:w-6 text-center flex-shrink-0">{emoji}</span>
                  <span className={`text-sm font-semibold ${
                    value === true ? 'text-emerald-600 dark:text-emerald-300 line-through decoration-emerald-600' :
                    value === false ? 'text-slate-400 dark:text-slate-500 line-through decoration-slate-400 dark:decoration-slate-600' :
                    'text-slate-700 dark:text-slate-200'
                  }`}>{label}</span>
                </div>
                <div className="w-full sm:w-[320px] flex-shrink-0">
                  <StateButtons value={value} onSet={(v) => setField(key, v)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CRM 단독 */}
      {item.hasCrmUpdate && (
        <div>
          <div className="flex items-center justify-between mb-2 sm:mb-3">
            <div className="flex items-center gap-2">
              <Building2 className="w-4 h-4 sm:w-5 sm:h-5 text-violet-400" />
              <span className="text-violet-400 text-sm sm:text-base font-bold">
                {item.crmType === 'NEW' ? '고객관리 (신규납품)' : item.crmType === 'AS' ? '고객관리 (AS)' : '고객관리 CRM'}
              </span>
            </div>
            <span className="text-sm sm:text-base text-slate-400 font-medium">
              {crmHandled}/{activeCrmLabels.length} 처리
              {crmPending > 0 && <span className="text-amber-400 ml-1.5">({crmPending}개 미완)</span>}
            </span>
          </div>
          <div className="bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200 dark:border-slate-700/40 overflow-hidden divide-y divide-slate-200 dark:divide-slate-700/30">
            {crmItems.map(({ key, label, emoji, value }) => (
              <div key={key} className="px-4 py-3 sm:px-5 sm:py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg w-5 sm:w-6 text-center flex-shrink-0">{emoji}</span>
                  <span className={`text-sm font-semibold ${
                    value === true ? 'text-emerald-600 dark:text-emerald-300 line-through decoration-emerald-600' :
                    value === false ? 'text-slate-400 dark:text-slate-500 line-through decoration-slate-400 dark:decoration-slate-600' :
                    'text-slate-700 dark:text-slate-200'
                  }`}>{label}</span>
                </div>
                <div className="w-full sm:w-[320px] flex-shrink-0">
                  <StateButtons value={value} onSet={(v) => setField(key, v)} />
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* 부품 등록 섹션 */}
      <ChecklistPartSelector item={item} parts={parts} />

    </div>
  )
}
