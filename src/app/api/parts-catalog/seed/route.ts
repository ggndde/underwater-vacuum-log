import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import partsData from '@/../data/parts-catalog.json'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const existing = await (prisma as any).partCatalog.count()
    if (existing > 0) {
        return NextResponse.json({ message: `이미 ${existing}개 부품이 등록되어 있습니다.`, count: existing })
    }

    const parts = partsData as { article: string; description: string }[]

    await (prisma as any).partCatalog.createMany({
        data: parts.map(p => ({ article: p.article, description: p.description })),
        skipDuplicates: true,
    })

    const count = await (prisma as any).partCatalog.count()
    return NextResponse.json({ message: `${count}개 부품이 등록되었습니다.`, count }, { status: 201 })
}
