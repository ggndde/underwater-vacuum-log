import { prisma } from '@/lib/prisma'
import type { Part } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

// ── GET: diagram detail with hotspots + matching parts from DB ───────────────
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })

    const diagram = await (prisma as any).diagramSheet.findUnique({
        where: { id },
        include: { hotspots: true },
    })
    if (!diagram) return NextResponse.json({ error: '도면을 찾을 수 없습니다.' }, { status: 404 })

    // Enrich hotspots with part info from DB
    const articleNos = Array.from(new Set((diagram.hotspots as any[]).map((h: any) => h.articleNo))) as string[]
    const parts = articleNos.length > 0
        ? await prisma.part.findMany({ where: { articleNo: { in: articleNos } } })
        : []
    const partMap = new Map<string, Part>(parts.map((p: Part) => [p.articleNo, p]))

    const enrichedHotspots = (diagram.hotspots as any[]).map((h: any) => ({
        ...h,
        part: partMap.get(h.articleNo) ?? null,
    }))

    return NextResponse.json({ ...diagram, hotspots: enrichedHotspots })
}

// ── DELETE ────────────────────────────────────────────────────────────────────
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })

    await (prisma as any).diagramSheet.delete({ where: { id } })
    return NextResponse.json({ success: true })
}

// ── PATCH: update metadata (name, drawingNo, category) or hotspots ───────────
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })

    const body = await req.json()

    // Metadata update
    if (body.name !== undefined || body.drawingNo !== undefined || body.category !== undefined) {
        const data: Record<string, string | null> = {}
        if (body.name !== undefined) data.name = String(body.name).trim()
        if (body.drawingNo !== undefined) data.drawingNo = body.drawingNo ? String(body.drawingNo).trim() : null
        if (body.category !== undefined) data.category = String(body.category)
        await (prisma as any).diagramSheet.update({ where: { id }, data })
        return NextResponse.json({ success: true })
    }

    // Hotspot replacement
    const { hotspots } = body
    await (prisma as any).diagramHotspot.deleteMany({ where: { diagramId: id } })
    if (Array.isArray(hotspots) && hotspots.length > 0) {
        await (prisma as any).diagramHotspot.createMany({
            data: hotspots.map((h: any) => ({
                diagramId: id,
                articleNo: String(h.articleNo).trim(),
                x: Math.min(100, Math.max(0, Number(h.x) || 0)),
                y: Math.min(100, Math.max(0, Number(h.y) || 0)),
                label: h.label?.trim() || null,
            })),
        })
    }

    return NextResponse.json({ success: true })
}
