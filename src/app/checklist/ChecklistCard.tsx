'use client'

import { useState, useTransition, useRef } from 'react'
import Link from 'next/link'
import { CheckCircle2, Clock, Truck, Building2, ChevronRight, Trash2, Loader2, XCircle, MinusCircle, ArrowRight, Timer, Plus, X, ChevronDown, ChevronUp } from 'lucide-react'
import { deleteWorkChecklist, moveToTodayWorkChecklist } from '@/app/actions'
import { useRouter } from 'next/navigation'
import { ChecklistPartSelector } from './ChecklistPartSelector'
import { lookupError } from '@/lib/marinerErrors'

type ErrorEntry = { code: string; count: string }

type MachineUnit = {
    unitNo: number
    serialNo: string
    hours: string
    cycles: string
    errors: ErrorEntry[]
    notes: string
}

function MachineUnitPanel({ unit, onChange, onRemove, canRemove, done }: {
    unit: MachineUnit
    onChange: (patch: Partial<MachineUnit>) => void
    onRemove: () => void
    canRemove: boolean
    done: boolean
}) {
    const [errCode, setErrCode] = useState('')
    const [errCount, setErrCount] = useState('')
    const codeRef = useRef<HTMLInputElement>(null)

    const lookup = errCode.trim() ? lookupError(parseInt(errCode.trim())) : undefined

    const addEntry = () => {
        const c = errCode.trim()
        const n = errCount.trim()
        if (!c) return
        const idx = unit.errors.findIndex(e => e.code === c)
        let next: ErrorEntry[]
        if (idx >= 0) {
            next = [...unit.errors]
            const existing = next[idx].count
            next[idx] = { code: c, count: existing && n ? `${existing}, ${n}` : existing || n }
        } else {
            next = [...unit.errors, { code: c, count: n }]
        }
        onChange({ errors: next })
        setErrCode('')
        setErrCount('')
        codeRef.current?.focus()
    }

    const removeEntry = (i: number) => onChange({ errors: unit.errors.filter((_, idx) => idx !== i) })

    return (
        <div className="border border-slate-200 dark:border-slate-700/60 rounded-xl p-3 space-y-3 bg-white dark:bg-slate-800/60">
            {/* 헤더: 호기 + 시리얼 */}
            <div className="flex items-center gap-2">
                <span className="text-sm font-black text-orange-500 dark:text-orange-400 shrink-0 w-10">{unit.unitNo}호기</span>
                <input
                    type="text"
                    value={unit.serialNo}
                    onChange={e => onChange({ serialNo: e.target.value })}
                    disabled={done}
                    placeholder="Serial No."
                    className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-1.5 text-sm text-slate-900 dark:text-white outline-none focus:border-orange-400 transition-colors disabled:opacity-50 font-mono"
                />
                {canRemove && !done && (
                    <button onClick={onRemove} className="text-slate-300 dark:text-slate-600 hover:text-red-400 dark:hover:text-red-400 transition-colors shrink-0">
                        <X className="w-4 h-4" />
                    </button>
                )}
            </div>

            {/* Hours + Cycles */}
            <div className="flex gap-2">
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 mb-1">⏱ Hours</label>
                    <input type="number" min="0" step="0.1" value={unit.hours} disabled={done}
                        onChange={e => onChange({ hours: e.target.value })}
                        placeholder="0.0"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-orange-400 transition-colors disabled:opacity-50" />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-bold text-slate-400 mb-1">🔄 Cycles</label>
                    <input type="number" min="0" value={unit.cycles} disabled={done}
                        onChange={e => onChange({ cycles: e.target.value })}
                        placeholder="0"
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-orange-400 transition-colors disabled:opacity-50" />
                </div>
            </div>

            {/* Errors */}
            <div>
                <label className="block text-xs font-bold text-slate-400 mb-1.5">⚠️ Errors</label>
                {unit.errors.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-2">
                        {unit.errors.map((e, i) => (
                            <span key={i} className="flex items-center gap-1 bg-red-50 dark:bg-red-900/25 border border-red-200 dark:border-red-700/40 text-red-700 dark:text-red-300 rounded-full px-2.5 py-0.5 text-xs font-mono font-bold">
                                {e.code}{e.count ? ` : ${e.count}` : ''}
                                {!done && <button onClick={() => removeEntry(i)} className="text-red-400 hover:text-red-600 ml-0.5"><X className="w-3 h-3" /></button>}
                            </span>
                        ))}
                    </div>
                )}
                {!done && (
                    <div className="flex flex-col gap-2">
                        <div className="flex gap-2 items-center">
                            <input ref={codeRef} type="number" value={errCode}
                                onChange={e => setErrCode(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addEntry()}
                                placeholder="코드"
                                className="w-20 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-red-400 transition-colors" />
                            <span className="text-slate-400 font-bold">:</span>
                            <input type="text" value={errCount}
                                onChange={e => setErrCount(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addEntry()}
                                placeholder="발생횟수 (예: 1~3)"
                                className="flex-1 bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-2.5 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-red-400 transition-colors" />
                        </div>
                        <button onClick={addEntry} disabled={!errCode.trim()}
                            className="flex items-center justify-center gap-1 w-full py-2 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 hover:bg-red-100 dark:hover:bg-red-900/40 rounded-lg text-xs font-bold disabled:opacity-40 transition-colors">
                            <Plus className="w-3.5 h-3.5" />에러 추가
                        </button>
                        {lookup && (
                            <div className="p-3 bg-amber-50 dark:bg-amber-900/20 border border-amber-200 dark:border-amber-700/40 rounded-xl">
                                <p className="text-xs font-bold text-amber-800 dark:text-amber-300 mb-1">
                                    <span className="font-mono bg-amber-100 dark:bg-amber-900/40 px-1.5 py-0.5 rounded mr-1.5">{errCode}</span>
                                    {lookup.name}
                                    <span className="ml-1.5 text-[10px] font-normal text-amber-600 dark:text-amber-400 bg-amber-100 dark:bg-amber-900/30 px-1.5 py-0.5 rounded-full">{lookup.category}</span>
                                </p>
                                <p className="text-xs text-amber-700 dark:text-amber-300 mb-1"><span className="font-semibold">원인:</span> {lookup.cause}</p>
                                <p className="text-xs text-amber-700 dark:text-amber-300"><span className="font-semibold">해결:</span> {lookup.solution}</p>
                            </div>
                        )}
                        {errCode.trim() && !lookup && parseInt(errCode.trim()) > 0 && (
                            <p className="text-xs text-slate-400 dark:text-slate-500">코드 {errCode}에 대한 정보가 없습니다.</p>
                        )}
                    </div>
                )}
            </div>

            {/* Notes */}
            <div>
                <label className="block text-xs font-bold text-slate-400 mb-1">📝 특이사항</label>
                <textarea value={unit.notes} disabled={done}
                    onChange={e => onChange({ notes: e.target.value })}
                    placeholder="특이사항, 메모 등"
                    rows={2}
                    className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg px-3 py-2 text-sm text-slate-900 dark:text-white outline-none focus:border-orange-400 transition-colors resize-none disabled:opacity-50" />
            </div>
        </div>
    )
}

function initMachines(item: any): MachineUnit[] {
    try {
        const data = item.machineData ? JSON.parse(item.machineData) : null
        if (Array.isArray(data) && data.length > 0) return data
        // 레거시 필드 마이그레이션
        if (item.machineHours != null || item.machineCycles != null || item.machineErrors || item.machineNotes) {
            return [{
                unitNo: 1, serialNo: '',
                hours: item.machineHours != null ? String(item.machineHours) : '',
                cycles: item.machineCycles != null ? String(item.machineCycles) : '',
                errors: item.machineErrors ? JSON.parse(item.machineErrors) : [],
                notes: item.machineNotes ?? '',
            }]
        }
    } catch {}
    return [{ unitNo: 1, serialNo: '', hours: '', cycles: '', errors: [], notes: '' }]
}

function MachineDataPanel({ item, done, onSaved }: { item: any; done: boolean; onSaved: (patch: Record<string, unknown>) => void }) {
    const hasData = !!(item.machineData || item.machineHours != null || item.machineCycles != null || item.machineErrors || item.machineNotes)
    const [open, setOpen] = useState(false)
    const [machines, setMachines] = useState<MachineUnit[]>(() => initMachines(item))
    const [saving, setSaving] = useState(false)

    const updateMachine = (i: number, patch: Partial<MachineUnit>) =>
        setMachines(prev => { const next = [...prev]; next[i] = { ...next[i], ...patch }; return next })

    const addMachine = () =>
        setMachines(prev => [...prev, { unitNo: prev.length + 1, serialNo: '', hours: '', cycles: '', errors: [], notes: '' }])

    const removeMachine = (i: number) =>
        setMachines(prev => prev.filter((_, idx) => idx !== i).map((m, idx) => ({ ...m, unitNo: idx + 1 })))

    const handleSave = async () => {
        setSaving(true)
        const fd = new FormData()
        fd.append('id', String(item.id))
        fd.append('machineData', JSON.stringify(machines))
        await fetch('/api/checklist', { method: 'PATCH', body: fd })
        onSaved({ machineData: JSON.stringify(machines) })
        setSaving(false)
        setOpen(false)
    }

    const summary = machines.map(m => {
        const parts = [m.hours && `${m.hours}h`, m.cycles && `${m.cycles}c`, m.errors.length && `에러 ${m.errors.length}건`].filter(Boolean).join(' ')
        return parts ? `${m.unitNo}호기 ${parts}` : ''
    }).filter(Boolean).join(' | ')

    return (
        <div className="px-4 py-3 sm:px-5 sm:py-3.5">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                    <Timer className="w-4 h-4 text-orange-400 flex-shrink-0" />
                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-200 shrink-0">시간/사이클/에러</span>
                    {hasData && !open && summary && (
                        <span className="text-xs text-slate-400 dark:text-slate-500 truncate">{summary}</span>
                    )}
                </div>
                {!done && (
                    <button onClick={() => setOpen(v => !v)}
                        className="flex items-center gap-1 text-xs font-bold px-2.5 py-1.5 rounded-lg transition-colors bg-orange-50 dark:bg-orange-900/20 text-orange-600 dark:text-orange-400 hover:bg-orange-100 dark:hover:bg-orange-900/40 shrink-0 ml-2">
                        {open ? <><ChevronUp className="w-3.5 h-3.5" />닫기</> : hasData ? <><ChevronDown className="w-3.5 h-3.5" />수정</> : <>입력</>}
                    </button>
                )}
            </div>

            {open && (
                <div className="mt-4 space-y-3">
                    {machines.map((m, i) => (
                        <MachineUnitPanel
                            key={i}
                            unit={m}
                            onChange={patch => updateMachine(i, patch)}
                            onRemove={() => removeMachine(i)}
                            canRemove={machines.length > 1}
                            done={done}
                        />
                    ))}

                    {!done && (
                        <button onClick={addMachine}
                            className="flex items-center justify-center gap-2 w-full py-2.5 border-2 border-dashed border-orange-200 dark:border-orange-800/40 text-orange-400 dark:text-orange-500 hover:border-orange-400 hover:text-orange-500 dark:hover:border-orange-600 rounded-xl text-sm font-bold transition-colors">
                            <Plus className="w-4 h-4" />호기 추가
                        </button>
                    )}

                    <button onClick={handleSave} disabled={saving}
                        className="w-full py-2.5 bg-orange-500 hover:bg-orange-600 text-white text-sm font-bold rounded-xl transition-colors disabled:opacity-50 flex items-center justify-center gap-2">
                        {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                        {saving ? '저장 중...' : '저장'}
                    </button>
                </div>
            )}
        </div>
    )
}

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
        const keys = [...CRM_LABELS.map(l => l.key)]
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

            {/* 시간/사이클/에러 */}
            <MachineDataPanel
              item={item}
              done={done}
              onSaved={(patch) => setItem((prev: any) => ({ ...prev, ...patch }))}
            />
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

            {/* 시간/사이클/에러 (AS 전용, 신규납품 제외) */}
            {item.crmType !== 'NEW' && (
              <MachineDataPanel
                item={item}
                done={done}
                onSaved={(patch) => setItem((prev: any) => ({ ...prev, ...patch }))}
              />
            )}
          </div>
        </div>
      )}

      {/* 부품 등록 섹션 */}
      <ChecklistPartSelector item={item} parts={parts} />

    </div>
  )
}
