import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return new NextResponse('Unauthorized', { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return new NextResponse('Bad Request', { status: 400 })

    const diagram = await (prisma as any).diagramSheet.findUnique({
        where: { id },
        select: { imageData: true, mimeType: true },
    })
    if (!diagram) return new NextResponse('Not Found', { status: 404 })

    // imageData is a base64 data URL: "data:<mime>;base64,<data>"
    const base64 = (diagram.imageData as string).split(',')[1]
    const imageBuffer = Buffer.from(base64, 'base64')

    return new NextResponse(imageBuffer, {
        headers: {
            'Content-Type': diagram.mimeType,
            'Cache-Control': 'private, max-age=3600',
        },
    })
}
