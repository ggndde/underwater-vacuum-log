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

// POST /api/diagrams/[id]/rotate  { "degrees": 90 | 180 | 270 }
export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })

    const body = await req.json().catch(() => ({}))
    const degrees = [90, 180, 270].includes(Number(body.degrees)) ? Number(body.degrees) : 90

    const diagram = await (prisma as any).diagramSheet.findUnique({
        where: { id },
        select: { id: true, imageData: true },
    })
    if (!diagram) return NextResponse.json({ error: '도면을 찾을 수 없습니다.' }, { status: 404 })

    const base64Data = diagram.imageData.split(',')[1]
    const rotated = Buffer.from(
        await sharp(Buffer.from(base64Data, 'base64')).rotate(degrees).png().toBuffer()
    )
    const newDataUrl = `data:image/png;base64,${rotated.toString('base64')}`
    const thumbnailData = await makeThumbnail(rotated)

    await (prisma as any).diagramSheet.update({
        where: { id },
        data: { imageData: newDataUrl, thumbnailData, mimeType: 'image/png' },
    })

    return NextResponse.json({ ok: true })
}
