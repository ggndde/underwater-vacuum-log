import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string } }

export async function GET(req: NextRequest, { params }: Params) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const hotspots = await (prisma as any).diagramHotspot.findMany({
        where: { diagramId: id },
        orderBy: { id: 'asc' },
    })

    // Enrich with catalog descriptions if available
    const articles = hotspots.map((h: any) => h.articleNo)
    let catalog: Record<string, string> = {}
    try {
        const parts = await (prisma as any).partCatalog.findMany({
            where: { article: { in: articles } },
            select: { article: true, description: true },
        })
        catalog = Object.fromEntries(parts.map((p: any) => [p.article, p.description]))
    } catch { /* partCatalog may not exist */ }

    return NextResponse.json({
        hotspots: hotspots.map((h: any) => ({
            ...h,
            description: catalog[h.articleNo] ?? null,
        })),
    })
}

export async function POST(req: NextRequest, { params }: Params) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const { articleNo, label } = await req.json()
    if (!articleNo?.trim()) return NextResponse.json({ error: '부품 번호를 입력해 주세요.' }, { status: 400 })

    const article = articleNo.trim()

    // Prevent duplicates on this diagram
    const existing = await (prisma as any).diagramHotspot.findFirst({
        where: { diagramId: id, articleNo: article },
    })
    if (existing) return NextResponse.json({ error: '이미 등록된 부품 번호입니다.' }, { status: 409 })

    const hotspot = await (prisma as any).diagramHotspot.create({
        data: { diagramId: id, articleNo: article, label: label ?? null, x: 0, y: 0 },
    })

    // Try to get description from catalog
    let description: string | null = null
    try {
        const part = await (prisma as any).partCatalog.findUnique({ where: { article } })
        description = part?.description ?? null
    } catch { /* ignore */ }

    return NextResponse.json({ hotspot: { ...hotspot, description } }, { status: 201 })
}
