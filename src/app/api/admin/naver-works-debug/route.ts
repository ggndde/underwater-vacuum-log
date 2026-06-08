export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { getNaverWorksAccessToken, fetchBoards } from '@/lib/naverWorks'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.name) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  try {
    const token = await getNaverWorksAccessToken()
    const boardsResult = await fetchBoards()
    return NextResponse.json({
      tokenOk: !!token,
      boards: boardsResult?.boards?.map((b: any) => ({
        id: b.boardId,
        name: b.boardName,
      })) ?? [],
    })
  } catch (error: any) {
    return NextResponse.json({ tokenOk: false, error: error.message }, { status: 500 })
  }
}
