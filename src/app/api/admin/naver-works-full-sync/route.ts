export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { runNaverWorksSync } from '@/lib/naverWorksSync'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.name) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    // forceAll=true: 모든 게시글의 기존 댓글 전부 스캔 (1회성)
    const result = await runNaverWorksSync(true)
    return NextResponse.json({ success: true, message: '전체 싱크 완료', ...result })
  } catch (error: any) {
    console.error('Full sync error:', error)
    return NextResponse.json({ success: false, error: error.message }, { status: 500 })
  }
}
