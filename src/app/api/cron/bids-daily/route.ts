import { prisma } from '@/lib/prisma'
import { NextResponse } from 'next/server'
import { fetchAllBids, fetchConstructionBids } from '@/lib/koneps'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // Cron runs at 0 0 * * * UTC = 9 AM KST (UTC+9)
    // We fetch yesterday's KST date to surface overnight postings for the new workday
    const nowUTC = new Date()
    const kstOffset = 9 * 60 * 60 * 1000
    const nowKST = new Date(nowUTC.getTime() + kstOffset)
    const yesterdayKST = new Date(nowKST.getTime() - 24 * 60 * 60 * 1000)
    const dateStr = yesterdayKST.toISOString().split('T')[0].replace(/-/g, '')
    const startDate = `${dateStr}0000`
    const endDate = `${dateStr}2359`

    console.log(`[bids-daily] Fetching bids for KST date: ${dateStr}`)

    const [bids, pools] = await Promise.all([
      fetchAllBids(startDate, endDate),
      fetchConstructionBids(startDate, endDate),
    ])

    await Promise.all([
      prisma.appCache.upsert({
        where: { key: 'bids_notification' },
        update: { value: JSON.stringify({ fetchedForDate: dateStr, hasNew: bids.length > 0, count: bids.length }) },
        create: { key: 'bids_notification', value: JSON.stringify({ fetchedForDate: dateStr, hasNew: bids.length > 0, count: bids.length }) },
      }),
      prisma.appCache.upsert({
        where: { key: 'pools_notification' },
        update: { value: JSON.stringify({ fetchedForDate: dateStr, hasNew: pools.length > 0, count: pools.length }) },
        create: { key: 'pools_notification', value: JSON.stringify({ fetchedForDate: dateStr, hasNew: pools.length > 0, count: pools.length }) },
      }),
    ])

    console.log(`[bids-daily] Done. bids=${bids.length}, pools=${pools.length}`)

    return NextResponse.json({
      success: true,
      date: dateStr,
      bidsCount: bids.length,
      poolsCount: pools.length,
    })
  } catch (error: any) {
    console.error('[bids-daily] error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
