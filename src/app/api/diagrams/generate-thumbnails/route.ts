import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

async function makeThumbnail(buffer: Buffer): Promise<string> {
    const thumb = Buffer.from(
        await sharp(buffer)
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 55 })
            .toBuffer()
    )
    return `data:image/jpeg;base64,${thumb.toString('base64')}`
}

// POST /api/diagrams/generate-thumbnails
// One-time migration: generates thumbnails for all diagrams missing one.
// Processes in batches of 5 to avoid timeout.
export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    // Find diagrams without thumbnails
    const missing = await (prisma as any).diagramSheet.findMany({
        where: { thumbnailData: null },
        select: { id: true, imageData: true },
        take: 20,
    })

    if (missing.length === 0) {
        return NextResponse.json({ done: true, processed: 0 })
    }

    let processed = 0
    for (const d of missing) {
        try {
            const base64 = (d.imageData as string).split(',')[1]
            const buf = Buffer.from(base64, 'base64')
            const thumbnailData = await makeThumbnail(buf)
            await (prisma as any).diagramSheet.update({
                where: { id: d.id },
                data: { thumbnailData },
            })
            processed++
        } catch (err) {
            console.error(`썸네일 생성 실패 id=${d.id}:`, err)
        }
    }

    const remaining = await (prisma as any).diagramSheet.count({ where: { thumbnailData: null } })
    return NextResponse.json({ done: remaining === 0, processed, remaining })
}
