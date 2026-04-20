import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const q = req.nextUrl.searchParams.get('q')?.trim() ?? ''
    if (!q) return NextResponse.json({ parts: [], diagrams: [] })

    const isNumeric = /^\d+$/.test(q)

    const parts = await (prisma as any).partCatalog.findMany({
        where: isNumeric
            ? { article: { contains: q } }
            : { OR: [{ article: { contains: q } }, { description: { contains: q, mode: 'insensitive' } }] },
        orderBy: { article: 'asc' },
        take: 50,
    })

    // Find diagrams that have hotspots matching any of the found article numbers
    const articles = parts.map((p: { article: string }) => p.article)

    // Also search directly by article if query looks like a number
    if (isNumeric && !articles.includes(q)) articles.push(q)

    const diagrams = articles.length > 0
        ? await (prisma as any).diagramSheet.findMany({
            where: {
                hotspots: { some: { articleNo: { in: articles } } },
            },
            select: {
                id: true,
                name: true,
                drawingNo: true,
                category: true,
                thumbnailData: true,
                hotspots: {
                    where: { articleNo: { in: articles } },
                    select: { articleNo: true, label: true },
                },
            },
        })
        : []

    return NextResponse.json({ parts, diagrams })
}
