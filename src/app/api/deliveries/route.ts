import { prisma } from '@/lib/prisma'
export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'


export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const { searchParams } = new URL(req.url)
    const year = parseInt(searchParams.get('year') || String(new Date().getFullYear()))
    const month = parseInt(searchParams.get('month') || String(new Date().getMonth() + 1))

    const start = new Date(year, month - 1, 1)
    const end = new Date(year, month, 1)

    const deliveries = await prisma.delivery.findMany({
        where: {
            date: {
                gte: start,
                lt: end,
            }
        },
        orderBy: { date: 'asc' }
    })

    return NextResponse.json({ deliveries })
}
