import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type Params = { params: { id: string; hotspotId: string } }

export async function DELETE(req: NextRequest, { params }: Params) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const hotspotId = parseInt(params.hotspotId)
    if (isNaN(hotspotId)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    await (prisma as any).diagramHotspot.delete({ where: { id: hotspotId } })
    return NextResponse.json({ ok: true })
}
