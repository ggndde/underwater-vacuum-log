export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client'
import { addPart } from '@/app/actions'
import { PartsClient } from './PartsClient'
import { Package } from 'lucide-react'

const prisma = new PrismaClient()

const CATEGORIES = ['CP', 'PP', 'NV3', '공용'] as const

export default async function PartsPage() {
    const parts = await prisma.part.findMany({
        include: { transactions: { orderBy: { createdAt: 'asc' } } },
        orderBy: [{ category: 'asc' }, { name: 'asc' }]
    })

    return (
        <div className="max-w-4xl mx-auto p-4 md:p-6">
            <header className="mb-6">
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                            <Package className="w-6 h-6 text-blue-600" />
                            부품 재고 관리
                        </h1>
                        <p className="text-sm text-slate-500 mt-1">총 {parts.length}종 부품 관리 중</p>
                    </div>
                </div>
            </header>

            {/* Add Part Form */}
            <form action={addPart} className="bg-white border border-slate-200 rounded-2xl p-5 mb-6 shadow-sm">
                <h2 className="text-sm font-bold text-slate-600 uppercase mb-4">+ 새 부품 추가</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-3">
                    <input
                        name="articleNo"
                        required
                        placeholder="Article No. (예: AX-1234)"
                        className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                        name="name"
                        required
                        placeholder="부품명 (예: PVC 흡입노즐)"
                        className="border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                </div>
                <div className="flex gap-3">
                    {/* Category select */}
                    <select
                        name="category"
                        defaultValue="공용"
                        className="border border-slate-200 rounded-xl px-3 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                    >
                        {CATEGORIES.map(c => (
                            <option key={c} value={c}>{c}</option>
                        ))}
                    </select>
                    <input
                        name="stock"
                        type="number"
                        min="0"
                        defaultValue="0"
                        placeholder="초기 수량"
                        className="w-24 border border-slate-200 rounded-xl px-4 py-2.5 text-sm outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <button
                        type="submit"
                        className="flex-1 bg-blue-600 text-white px-5 py-2.5 rounded-xl text-sm font-bold hover:bg-blue-700 transition-colors"
                    >
                        추가
                    </button>
                </div>
            </form>

            <PartsClient parts={parts} categories={CATEGORIES} />
        </div>
    )
}
