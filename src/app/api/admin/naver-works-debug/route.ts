export const dynamic = 'force-dynamic'
import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import jwt from 'jsonwebtoken'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.name) {
    return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
  }

  const CLIENT_ID = process.env.NAVER_WORKS_CLIENT_ID || ''
  const CLIENT_SECRET = process.env.NAVER_WORKS_CLIENT_SECRET || ''
  const SERVICE_ACCOUNT = process.env.NAVER_WORKS_SERVICE_ACCOUNT || ''
  const PRIVATE_KEY = (process.env.NAVER_WORKS_PRIVATE_KEY || '').replace(/\\n/g, '\n')

  const envCheck = {
    CLIENT_ID: !!CLIENT_ID,
    CLIENT_SECRET: !!CLIENT_SECRET,
    SERVICE_ACCOUNT: !!SERVICE_ACCOUNT,
    PRIVATE_KEY: !!PRIVATE_KEY,
    PRIVATE_KEY_starts: PRIVATE_KEY.slice(0, 30),
  }

  if (!CLIENT_ID || !CLIENT_SECRET || !SERVICE_ACCOUNT || !PRIVATE_KEY) {
    return NextResponse.json({ envCheck, error: '환경변수 누락' }, { status: 500 })
  }

  try {
    const iat = Math.floor(Date.now() / 1000)
    const assertion = jwt.sign(
      { iss: CLIENT_ID, sub: SERVICE_ACCOUNT, iat, exp: iat + 3600 },
      PRIVATE_KEY,
      { algorithm: 'RS256' }
    )

    const params = new URLSearchParams()
    params.append('grant_type', 'urn:ietf:params:oauth:grant-type:jwt-bearer')
    params.append('assertion', assertion)
    params.append('client_id', CLIENT_ID)
    params.append('client_secret', CLIENT_SECRET)
    params.append('scope', 'board board.read')

    const res = await fetch('https://auth.worksmobile.com/oauth2/v2.0/token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
      body: params.toString(),
    })

    const body = await res.text()
    return NextResponse.json({
      envCheck,
      tokenStatus: res.status,
      tokenResponse: body,
    })
  } catch (error: any) {
    return NextResponse.json({ envCheck, error: error.message }, { status: 500 })
  }
}
