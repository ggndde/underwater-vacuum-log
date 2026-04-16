import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Plus, CheckCircle2, Clock, AlertTriangle, ChevronRight } from 'lucide-react'
import { ChecklistCard } from './ChecklistCard'
import { DateNav } from './DateNav'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

function getTodayKSTString(): string {
    const kstDate = new Date(new Date().toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
    const yyyy = kstDate.getFullYear();
    const mm = String(kstDate.getMonth() + 1).padStart(2, '0');
    const dd = String(kstDate.getDate()).padStart(2, '0');
    return `${yyyy}-${mm}-${dd}`;
}

export default async function ChecklistPage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>
}) {
  const session = await getServerSession(authOptions)
  const userName = session?.user?.name || ''

  const params = await searchParams
  const todayStr = getTodayKSTString()
  const dateStr = params.date ?? todayStr

  // Create boundary dates in KST (+09:00)
  const targetDate = new Date(`${dateStr}T00:00:00+09:00`);
  const nextDate = new Date(targetDate);
  nextDate.setDate(nextDate.getDate() + 1);

  const isToday = dateStr === todayStr;

  let items: any[] = []
  let pastIncomplete: { date: string; companyName: string }[] = []
  let parts: any[] = []

  try {
    parts = await prisma.part.findMany({
        orderBy: { name: 'asc' }
    })

    items = await (prisma as any).workChecklist.findMany({
      where: { 
        createdAt: { gte: targetDate, lt: nextDate },
        createdBy: userName
      },
      orderBy: { createdAt: 'desc' },
    })

    if (isToday) {
      const pastItems = await (prisma as any).workChecklist.findMany({
        where: {
          completed: false,
          createdAt: { lt: targetDate },
          createdBy: userName
        },
        orderBy: { createdAt: 'desc' },
        select: { createdAt: true, companyName: true },
      })

      pastIncomplete = pastItems.map((i: any) => {
        const iDate = new Date(i.createdAt.toLocaleString('en-US', { timeZone: 'Asia/Seoul' }));
        return {
          date: iDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' }),
          dateStr: `${iDate.getFullYear()}-${String(iDate.getMonth()+1).padStart(2, '0')}-${String(iDate.getDate()).padStart(2, '0')}`,
          companyName: i.companyName,
        }
      })
    }
  } catch { /* first load or prisma not regenerated */ }

  const incomplete = items.filter((i: any) => !i.completed)
  const complete = items.filter((i: any) => i.completed)

  // 미완료 업무를 날짜별로 그룹핑
  const pastByDate = pastIncomplete.reduce((acc: Record<string, { date: string; dateStr: string; companies: string[] }>, item: any) => {
    if (!acc[item.dateStr]) acc[item.dateStr] = { date: item.date, dateStr: item.dateStr, companies: [] }
    acc[item.dateStr].companies.push(item.companyName)
    return acc
  }, {})
  const pastGroups = Object.values(pastByDate)

  return (
    <div className="min-h-screen pb-16">
      <div className="max-w-2xl mx-auto px-4 pt-4 sm:pt-6">

        {/* 헤더 */}
        <div className="flex items-center justify-between mb-1">
          <h1 className="text-slate-900 dark:text-white text-xl sm:text-2xl font-black tracking-tight">업무 체크리스트</h1>
          <Link
            href="/checklist/new"
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg transition-colors text-sm flex-shrink-0 ml-4 shadow-sm"
          >
            <Plus className="w-4 h-4" /> 새 업무
          </Link>
        </div>

        {/* 날짜 네비게이션 */}
        <div className="mb-5 mt-3">
          <DateNav dateStr={dateStr} />
        </div>

        {/* 이전 미완료 알림 배너 (오늘 뷰에서만) */}
        {pastGroups.length > 0 && (
          <div className="mb-5 rounded-xl border border-amber-300 dark:border-amber-500/30 bg-amber-50 dark:bg-amber-500/10 overflow-hidden">
            <div className="flex items-center gap-2 px-3 py-2.5 border-b border-amber-200 dark:border-amber-500/30">
              <AlertTriangle className="w-4 h-4 text-amber-500 dark:text-amber-400 flex-shrink-0" />
              <span className="text-amber-700 dark:text-amber-300 font-bold text-sm">
                이전 날짜 미완료 업무 {pastIncomplete.length}건
              </span>
            </div>
            <div className="divide-y divide-amber-200 dark:divide-amber-500/20">
              {pastGroups.map((group) => (
                <Link
                  key={group.dateStr}
                  href={`/checklist?date=${group.dateStr}`}
                  className="flex items-center justify-between px-3 py-2.5 hover:bg-amber-100 dark:hover:bg-amber-500/20 transition-colors group"
                >
                  <div>
                    <span className="text-amber-800 dark:text-amber-200 text-xs font-semibold">{group.date}</span>
                    <p className="text-slate-500 dark:text-slate-400 text-[11px] mt-0.5">
                      {group.companies.join(', ')}
                    </p>
                  </div>
                  <div className="flex items-center gap-1 text-amber-600 dark:text-amber-400 text-[11px] font-bold group-hover:text-amber-700 dark:group-hover:text-amber-300">
                    <span>{group.companies.length}건</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </div>
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* 빈 상태 */}
        {items.length === 0 && (
          <div className="text-center py-16">
            <p className="text-4xl mb-3">📋</p>
            <p className="text-slate-600 dark:text-slate-300 text-lg font-semibold">
              {isToday ? '오늘' : targetDate.toLocaleDateString('ko-KR', { month: 'long', day: 'numeric' })} 등록된 업무가 없습니다
            </p>
            {isToday && (
              <>
                <p className="text-slate-500 text-sm mt-2 mb-6">새 업무 체크리스트를 시작해보세요</p>
                <Link
                  href="/checklist/new"
                  className="inline-flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold px-5 py-2.5 rounded-lg transition-colors text-sm"
                >
                  <Plus className="w-4 h-4" /> 업무 체크리스트 시작
                </Link>
              </>
            )}
          </div>
        )}

        {/* 미완료 */}
        {incomplete.length > 0 && (
          <div className="mb-5">
            <div className="flex items-center gap-1.5 mb-3">
              <Clock className="w-4 h-4 text-amber-600 dark:text-amber-400" />
              <p className="text-amber-600 dark:text-amber-400 text-sm font-bold">
                미완료 {incomplete.length}건
              </p>
              <span className="text-slate-500 text-xs">— 탭해서 완료</span>
            </div>
            <div className="flex flex-col gap-4">
              {incomplete.map((item: any) => (
                <ChecklistCard key={item.id} item={item} parts={parts} />
              ))}
            </div>
          </div>
        )}

        {/* 완료 */}
        {complete.length > 0 && (
          <div>
            <div className="flex items-center gap-1.5 mb-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
              <p className="text-emerald-600 dark:text-emerald-400 text-sm font-bold">
                완료 {complete.length}건
              </p>
            </div>
            <div className="flex flex-col gap-4 opacity-70">
              {complete.map((item: any) => (
                <ChecklistCard key={item.id} item={item} parts={parts} done />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
