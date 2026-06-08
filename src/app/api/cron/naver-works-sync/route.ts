import { NextResponse } from 'next/server'
import { runNaverWorksSync } from '@/lib/naverWorksSync'

export async function GET(req: Request) {
  const authHeader = req.headers.get('authorization')
  if (!process.env.CRON_SECRET || authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 })
  }

  try {
    // 증분 싱크: commentCount가 늘어난 게시글만 처리
    const result = await runNaverWorksSync(false)
    return NextResponse.json({ success: true, message: 'Sync completed', ...result })
  } catch (error: any) {
    console.error('Naver Works sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
