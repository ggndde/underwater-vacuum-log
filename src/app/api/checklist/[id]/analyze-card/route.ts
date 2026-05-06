import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'
import * as pdfParseLib from 'pdf-parse'
const pdfParse = (pdfParseLib as any).default ?? pdfParseLib

export const dynamic = 'force-dynamic'

const openai = new OpenAI()

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const fd = await req.formData()
    const file = fd.get('file') as File | null
    if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    let text: string
    try {
        const parsed = await pdfParse(buffer)
        text = parsed.text
    } catch {
        return NextResponse.json({ error: 'PDF 파싱 실패. 올바른 PDF 파일인지 확인하세요.' }, { status: 400 })
    }

    if (!text.trim()) {
        return NextResponse.json({ error: '텍스트를 추출할 수 없습니다.' }, { status: 400 })
    }

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
            role: 'user',
            content: `아래는 고객 관리카드 PDF에서 추출한 텍스트입니다.
각 행의 가장 왼쪽에는 날짜가 있습니다.
'교체'라는 단어가 포함된 항목만 골라서 부품 교체 기록으로 추출하세요.

반환 형식 (JSON만 반환, 설명 없이):
{"history": [{"date": "날짜 원문", "content": "교체 내용 전체 원문"}]}

규칙:
- '교체'가 포함된 항목만 추출
- date는 해당 행에서 가장 앞에 있는 날짜 (원문 그대로)
- content는 교체 관련 설명 전체 (원문 그대로, 날짜 제외)
- 날짜 기준 오래된 순서로 정렬

텍스트:
${text.slice(0, 10000)}`
        }],
        response_format: { type: 'json_object' },
    })

    let history: { date: string; content: string }[] = []
    try {
        const result = JSON.parse(response.choices[0].message.content || '{}')
        history = Array.isArray(result.history) ? result.history : []
    } catch {
        return NextResponse.json({ error: 'AI 응답 파싱 실패' }, { status: 500 })
    }

    await (prisma as any).workChecklist.update({
        where: { id },
        data: { partHistory: JSON.stringify(history) },
    })

    return NextResponse.json({ history })
}
