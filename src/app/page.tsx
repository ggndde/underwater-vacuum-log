export const dynamic = 'force-dynamic';
import Link from 'next/link'
import { prisma } from '@/lib/prisma'
import { Package, FileSearch, Truck, CheckSquare, Building2, BookImage } from 'lucide-react'

export default async function Home() {
    const partCount = await prisma.part.count()

    // 이번 달 납품 예정 건수
    const now = new Date()
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    let deliveryCount = 0
    try {
        deliveryCount = await (prisma as any).delivery.count({
            where: { date: { gte: monthStart, lt: monthEnd }, status: '예정' }
        })
    } catch {
        // Prisma client not yet regenerated — safe fallback
    }



    // 오늘 미완료 업무 체크리스트 건수
    let incompleteChecklistCount = 0
    try {
        const todayStart = new Date()
        todayStart.setHours(0, 0, 0, 0)
        const todayEnd = new Date(todayStart)
        todayEnd.setDate(todayEnd.getDate() + 1)
        incompleteChecklistCount = await (prisma as any).workChecklist.count({
            where: { createdAt: { gte: todayStart, lt: todayEnd }, completed: false }
        })
    } catch {
        // fallback
    }

    // 도면 수
    let diagramCount = 0
    try {
        diagramCount = await (prisma as any).diagramSheet.count()
    } catch {
        // fallback
    }

    const tiles = [
        {
            href: '/bids',
            icon: FileSearch,
            label: '입찰공고',
            sub: 'KONEPS 조회',
            color: 'from-violet-600 to-violet-800',
            glow: 'shadow-violet-900/40',
        },
        {
            href: '/pools',
            icon: Building2,
            label: '준공예정',
            sub: '건설 공고 조회',
            color: 'from-fuchsia-600 to-fuchsia-800',
            glow: 'shadow-fuchsia-900/40',
        },
        {
            href: '/delivery',
            icon: Truck,
            label: '납품 캘린더',
            sub: deliveryCount > 0 ? `이번 달 예정 ${deliveryCount}건` : '납품 일정 관리',
            color: 'from-blue-600 to-blue-800',
            glow: 'shadow-blue-900/40',
        },
        {
            href: '/parts',
            icon: Package,
            label: '부품 재고',
            sub: `부품 ${partCount}종 관리 중`,
            color: 'from-emerald-600 to-emerald-800',
            glow: 'shadow-emerald-900/40',
        },
        {
            href: '/checklist',
            icon: CheckSquare,
            label: '업무 체크리스트',
            sub: incompleteChecklistCount > 0 ? `미완료 ${incompleteChecklistCount}건 있음` : '오늘 업무 확인',
            color: incompleteChecklistCount > 0 ? 'from-amber-500 to-amber-700' : 'from-slate-600 to-slate-800',
            glow: incompleteChecklistCount > 0 ? 'shadow-amber-900/40' : 'shadow-slate-900/40',
        },
        {
            href: '/diagrams',
            icon: BookImage,
            label: '부품 도면',
            sub: diagramCount > 0 ? `도면 ${diagramCount}장 등록됨` : '인터랙티브 도면 뷰어',
            color: 'from-cyan-600 to-cyan-800',
            glow: 'shadow-cyan-900/40',
        },
    ]

    return (
        <div className="min-h-screen flex flex-col items-center justify-center p-8">
            {/* Header */}
            <div className="text-center mb-16">
                <p className="text-slate-500 text-sm font-semibold tracking-[0.25em] uppercase mb-4">
                    수중 청소기 서비스 관리 시스템
                </p>
                <h1 className="text-5xl font-black text-slate-900 dark:text-white tracking-tight">
                    Rosin Systech
                    <span className="text-slate-500 dark:text-slate-400 font-light ml-3 text-3xl">CO., LTD</span>
                </h1>
                <div className="mt-5 w-14 h-0.5 bg-gradient-to-r from-blue-500 to-violet-500 mx-auto rounded-full" />
            </div>

            {/* Tiles */}
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-5 w-full max-w-6xl">
                {tiles.map(({ href, icon: Icon, label, sub, color, glow }) => (
                    <Link
                        key={href}
                        href={href}
                        className={`group relative bg-gradient-to-br ${color} rounded-2xl p-7 shadow-xl ${glow} hover:scale-105 transition-transform duration-200`}
                    >
                        <div className="absolute inset-0 rounded-2xl bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                        <Icon className="w-10 h-10 text-white/80 mb-5" />
                        <p className="text-white font-bold text-xl leading-tight">{label}</p>
                        <p className="text-white/60 text-sm mt-2">{sub}</p>
                    </Link>
                ))}
            </div>

            <p className="mt-16 text-slate-500 dark:text-slate-700 text-sm">
                © 2026 Rosin Systech CO., LTD. All rights reserved.
            </p>
        </div>
    )
}
