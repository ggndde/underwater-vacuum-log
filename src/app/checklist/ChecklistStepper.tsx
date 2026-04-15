'use client'

import { useState, useTransition, useRef, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { CheckCircle2, Circle, ChevronLeft, Truck, Building2, Package, ArrowRight, ListChecks, Check, X, Loader2 } from 'lucide-react'
import { createWorkChecklist } from '@/app/actions'

type WorkType = 'delivery' | 'crm_as' | 'crm_new'

interface StepState {
  companyName: string
  workTypes: WorkType[]
  deliveryCarrier: string
  deliveryItems: string
  deliverySent: boolean | null   // null = 아직 미답변
  crmUpdated: boolean | null
  quoteSent: boolean | null
  photosAttached: boolean | null
  paymentUpdated: boolean | null
  naverWorksLogged: boolean | null
}

type StepId =
  | 'company'
  | 'workType'
  | 'deliveryCarrier'
  | 'deliveryItems'
  | 'deliverySent'
  | 'crmUpdated'
  | 'quoteSent'
  | 'photosAttached'
  | 'paymentUpdated'
  | 'naverWorksLogged'
  | 'done'

const CARRIERS = ['CJ대한통운', '로젠택배', '경동택배', '대신택배', '한진택배', '우체국택배', '롯데택배', '기타']

function buildStepFlow(workTypes: WorkType[]): StepId[] {
  return ['company', 'workType']
}

export default function ChecklistStepper() {
  const router = useRouter()
  const [, startTransition] = useTransition()
  const [checklistId, setChecklistId] = useState<number | null>(null)
  const [animating, setAnimating] = useState(false)
  const [direction, setDirection] = useState<'forward' | 'back'>('forward')
  const [isSaving, setIsSaving] = useState(false)
  const inputRef = useRef<HTMLInputElement | null>(null)

  const [state, setState] = useState<StepState>({
    companyName: '',
    workTypes: [],
    deliveryCarrier: '',
    deliveryItems: '',
    deliverySent: null,
    crmUpdated: null,
    quoteSent: null,
    photosAttached: null,
    paymentUpdated: null,
    naverWorksLogged: null,
  })

  const [stepIndex, setStepIndex] = useState(0)
  const stepFlow = buildStepFlow(state.workTypes)
  const currentStep = stepFlow[Math.min(stepIndex, stepFlow.length - 1)]

  useEffect(() => {
    if (inputRef.current) inputRef.current.focus()
  }, [currentStep])

  // ── 애니메이션 유틸 ─────────────────────────────────────────────────────────
  const animateAndGo = (dir: 'forward' | 'back', cb: () => void) => {
    setDirection(dir)
    setAnimating(true)
    setTimeout(() => { cb(); setAnimating(false) }, 220)
  }

  const goNext = () => animateAndGo('forward', () =>
    setStepIndex(i => Math.min(i + 1, stepFlow.length - 1))
  )
  const goBack = () => {
    if (stepIndex === 0) return
    animateAndGo('back', () => setStepIndex(i => Math.max(i - 1, 0)))
  }

  // ── 초기 레코드 생성 (workType 선택 후) ─────────────────────────────────────
  const createRecord = async (workTypes: WorkType[], companyName: string) => {
    const fd = new FormData()
    fd.append('companyName', companyName)
    const hasDelivery = workTypes.includes('delivery')
    const hasCrmAs = workTypes.includes('crm_as')
    const hasCrmNew = workTypes.includes('crm_new')
    
    fd.append('hasDelivery', String(hasDelivery))
    fd.append('hasCrmUpdate', String(hasCrmAs || hasCrmNew))
    
    if (hasCrmNew) {
      fd.append('crmType', 'NEW')
    } else {
      fd.append('crmType', 'AS')
    }
    
    fd.append('completed', 'false')
    const res = await createWorkChecklist(fd)
    setChecklistId(res.id)
    return res.id
  }

  // ── 필드 개별 저장 ────────────────────────────────────────────────────────────
  const patchField = async (id: number, fields: Record<string, string | boolean>) => {
    const fd = new FormData()
    fd.append('id', String(id))
    Object.entries(fields).forEach(([k, v]) => fd.append(k, String(v)))
    await fetch('/api/checklist', { method: 'PATCH', body: fd })
  }

  // ── 목록으로 돌아가기 (현황 저장 후) ─────────────────────────────────────────
  const goToList = () => {
    router.push('/checklist')
  }

  // ── workType 선택 후 다음 ─────────────────────────────────────────────────────
  const handleWorkTypeNext = async () => {
    if (state.workTypes.length === 0) return
    setIsSaving(true)
    await createRecord(state.workTypes, state.companyName)
    setIsSaving(false)
    
    // 무조건 목록으로 이동
    goToList()
  }

  // 상단 "목록으로" 버튼은 company/workType 이후에만 표시
  const showListButton = !['company', 'workType'].includes(currentStep)

  // ── 계산 값들 ──────────────────────────────────────────────────────────────────
  const toggleWorkType = (type: WorkType) => {
    setState(s => ({
      ...s,
      workTypes: [type], // 단일 선택으로 변경
    }))
  }

  const totalSteps = stepFlow.length - 1
  const progress = totalSteps > 0 ? Math.round((stepIndex / totalSteps) * 100) : 0

  const slideClass = animating
    ? direction === 'forward' ? 'opacity-0 translate-x-8' : 'opacity-0 -translate-x-8'
    : 'opacity-100 translate-x-0'

  return (
    <div className="min-h-screen flex flex-col bg-slate-50/50 dark:bg-slate-950/50">
      <div className="max-w-xl mx-auto w-full flex flex-col flex-1">

      {/* ── Top Bar ─────────────────────────────────────────────────────────── */}
      {currentStep !== 'done' && (
        <div className="px-5 pt-5 pb-2">
          <div className="flex items-center gap-3 mb-3">
            {stepIndex > 0 && currentStep !== 'company' ? (
              <button onClick={goBack} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
                <ChevronLeft className="w-6 h-6" />
              </button>
            ) : (
              <button onClick={goToList} className="text-slate-400 hover:text-white transition-colors flex-shrink-0">
                <X className="w-6 h-6" />
              </button>
            )}
            <div className="flex-1 h-1 bg-slate-200 dark:bg-slate-800 rounded-full overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-violet-500 rounded-full transition-all duration-500"
                style={{ width: `${progress}%` }}
              />
            </div>
            {showListButton && (
              <button
                onClick={goToList}
                className="flex-shrink-0 flex items-center gap-1.5 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white transition-colors text-xs font-medium bg-slate-200 hover:bg-slate-300 dark:bg-slate-800 dark:hover:bg-slate-700 px-3 py-1.5 rounded-lg"
              >
                <ListChecks className="w-3.5 h-3.5" />
                목록으로
              </button>
            )}
          </div>
          {/* 업체명 컨텍스트 */}
          {state.companyName && currentStep !== 'company' && (
            <p className="text-slate-500 text-xs font-medium px-1">{state.companyName}</p>
          )}
        </div>
      )}

      {/* ── Step Contents ───────────────────────────────────────────────────── */}
      <div className={`flex-1 flex flex-col px-5 pb-8 transition-all duration-200 ease-out ${slideClass}`}>

        {/* Step 1: 업체명 */}
        {currentStep === 'company' && (
          <div className="flex flex-col flex-1 pt-6 sm:pt-10">
            <p className="text-slate-400 text-sm font-medium mb-1">업무 체크리스트</p>
            <h1 className="text-slate-900 dark:text-white text-2xl sm:text-3xl font-bold mb-6 sm:mb-8 tracking-tight">어느 업체 업무인가요?</h1>
            <input
              ref={inputRef}
              type="text"
              placeholder="업체명 입력"
              value={state.companyName}
              onChange={e => setState(s => ({ ...s, companyName: e.target.value }))}
              onKeyDown={e => { if (e.key === 'Enter' && state.companyName.trim()) goNext() }}
              className="w-full bg-white dark:bg-slate-800 border-2 border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-lg sm:text-xl rounded-xl px-4 py-3.5 outline-none focus:border-blue-500 transition-colors placeholder:text-slate-400 dark:placeholder:text-slate-600 shadow-sm"
            />
            <button
              onClick={goNext}
              disabled={!state.companyName.trim()}
              className="mt-4 w-full py-3.5 px-4 rounded-xl bg-blue-600 text-white font-bold text-base sm:text-lg hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
            >
              다음 <ArrowRight className="w-5 h-5" />
            </button>
          </div>
        )}

        {/* Step 2: 업무 유형 */}
        {currentStep === 'workType' && (
          <div className="flex flex-col flex-1 pt-6 sm:pt-10">
            <p className="text-slate-400 text-sm font-medium mb-1 truncate">{state.companyName}</p>
            <h1 className="text-slate-900 dark:text-white text-2xl sm:text-3xl font-bold mb-1 sm:mb-2 tracking-tight">오늘 어떤 업무가 있나요?</h1>
            <p className="text-slate-400 text-sm sm:text-base mb-6 sm:mb-8">하나만 선택해주세요</p>
            <div className="flex flex-col gap-3 sm:gap-4">
              {[
                { type: 'delivery' as WorkType, icon: Truck, label: '택배 발송', sub: '업체에 부품 또는 제품 발송', color: 'blue' },
                { type: 'crm_as' as WorkType, icon: Building2, label: '고객관리(AS)', sub: '기존 수리/방문 후 업데이트', color: 'violet' },
                { type: 'crm_new' as WorkType, icon: Package, label: '고객관리(신규납품)', sub: '신규풀장 정보 및 기기등록', color: 'emerald' },
              ].map(({ type, icon: Icon, label, sub, color }) => {
                const sel = state.workTypes.includes(type)
                return (
                  <div
                    key={type}
                    onClick={() => toggleWorkType(type)}
                    role="button"
                    tabIndex={0}
                    className={`flex items-center gap-4 p-4 sm:p-5 rounded-xl border-2 transition-all text-left cursor-pointer ${sel ? `border-${color}-500 bg-${color}-500/10` : 'border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800/50 hover:border-slate-300 dark:hover:border-slate-600'}`}
                  >
                    <div className={`p-3 rounded-lg flex-shrink-0 ${sel ? `bg-${color}-600` : 'bg-slate-700'}`}>
                      <Icon className="w-5 h-5 sm:w-6 sm:h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <p className="text-slate-900 dark:text-white font-bold text-base sm:text-lg">{label}</p>
                      <p className="text-slate-400 text-xs sm:text-sm sm:mt-0.5">{sub}</p>
                    </div>
                    {sel && <CheckCircle2 className={`w-6 h-6 text-${color}-400 flex-shrink-0`} />}
                  </div>
                )
              })}
            </div>
            
            <button
              onClick={handleWorkTypeNext}
              disabled={state.workTypes.length === 0 || isSaving}
              className="mt-6 sm:mt-8 w-full py-3.5 px-4 rounded-xl bg-blue-600 text-white font-bold text-base sm:text-lg hover:bg-blue-700 transition-colors disabled:opacity-40 flex items-center justify-center gap-2 shadow-sm"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  저장 중...
                </>
              ) : (
                <>
                  시작하기 <ArrowRight className="w-5 h-5" />
                </>
              )}
            </button>
          </div>
        )}

      </div>
      </div>
    </div>
  )
}
