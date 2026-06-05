export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.name) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    const [bidsCache, poolsCache] = await Promise.all([
      prisma.appCache.findUnique({ where: { key: 'bids_notification' } }),
      prisma.appCache.findUnique({ where: { key: 'pools_notification' } }),
    ])

    const parseSafe = (raw: string | null) => {
      if (!raw) return null
      try { return JSON.parse(raw) } catch { return null }
    }

    const bidsData = parseSafe(bidsCache?.value ?? null)
    const poolsData = parseSafe(poolsCache?.value ?? null)

    return NextResponse.json({
      hasBids: bidsData?.hasNew ?? false,
      hasPools: poolsData?.hasNew ?? false,
      bidsDate: bidsData?.fetchedForDate ?? null,
      poolsDate: poolsData?.fetchedForDate ?? null,
    })
  } catch (error: any) {
    console.error('[notifications] error:', error)
    return NextResponse.json({ hasBids: false, hasPools: false, bidsDate: null, poolsDate: null })
  }
}
