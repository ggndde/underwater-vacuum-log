import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const SYSTEM_PROMPT = `당신은 수중청소기 제품의 부품 명세서(PDF)에서 부품 정보를 추출하는 전문가입니다.
반드시 JSON 형식으로만 응답하세요. 다른 설명 텍스트는 포함하지 마세요.`

const USER_PROMPT = (text: string) => `
아래는 부품 명세 PDF에서 추출한 텍스트입니다. 이 텍스트에서 모든 부품 정보를 찾아 JSON 배열로 반환하세요.

반환 형식:
{
  "parts": [
    {
      "articleNo": "부품 번호 (문서에 없으면 빈 문자열)",
      "name": "부품명 (한국어 또는 영어 그대로)",
      "category": "CP | PP | NV3 | 공용"
    }
  ]
}

카테고리 분류 기준:
- CP: Clever 또는 CP 계열 제품 전용 부품
- PP: Pulit 또는 PP 계열 제품 전용 부품
- NV3: Orca, NV3, Aquavac 계열 전용 부품
- 공용: 여러 제품에 공통 사용되는 부품 또는 분류 불명확한 부품

추출 규칙:
- 부품이 아닌 섹션 제목, 설명 텍스트는 제외하세요
- 같은 부품이 중복되면 한 번만 포함하세요
- 부품 번호가 있으면 반드시 포함하세요
- PDF 섹션 제목이나 제품명으로 카테고리를 추론하세요

PDF 텍스트:
${text}
`

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const formData = await req.formData()
    const file = formData.get('file') as File | null

    if (!file || file.type !== 'application/pdf') {
        return NextResponse.json({ error: 'PDF 파일을 업로드해 주세요.' }, { status: 400 })
    }
    if (file.size > 20 * 1024 * 1024) {
        return NextResponse.json({ error: 'PDF 파일 크기는 20MB 이하여야 합니다.' }, { status: 400 })
    }

    // Extract text from PDF
    const buffer = Buffer.from(await file.arrayBuffer())
    let pdfText: string
    try {
        // Dynamic import avoids the pdf-parse test-file initialization issue in Next.js
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pdfParse = (await import('pdf-parse') as any).default
        const data = await pdfParse(buffer)
        pdfText = data.text
    } catch (err) {
        console.error('PDF 텍스트 추출 오류:', err)
        return NextResponse.json({ error: 'PDF 텍스트를 읽지 못했습니다. 텍스트 기반 PDF인지 확인해 주세요.' }, { status: 422 })
    }

    if (!pdfText.trim()) {
        return NextResponse.json({ error: 'PDF에서 텍스트를 추출하지 못했습니다. 스캔된 이미지 PDF는 지원하지 않습니다.' }, { status: 422 })
    }

    // Parse with OpenAI
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    let parts: Array<{ articleNo: string; name: string; category: string }>
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [
                { role: 'system', content: SYSTEM_PROMPT },
                { role: 'user', content: USER_PROMPT(pdfText) },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.1,
        })

        const content = response.choices[0].message.content ?? '{}'
        const parsed = JSON.parse(content)
        parts = Array.isArray(parsed.parts) ? parsed.parts : []
    } catch (err) {
        console.error('OpenAI 파싱 오류:', err)
        return NextResponse.json({ error: 'AI 파싱에 실패했습니다. 잠시 후 다시 시도해 주세요.' }, { status: 500 })
    }

    // Basic validation & sanitization
    const validCategories = new Set(['CP', 'PP', 'NV3', '공용'])
    const sanitized = parts
        .filter((p) => typeof p.name === 'string' && p.name.trim())
        .map((p) => ({
            articleNo: typeof p.articleNo === 'string' ? p.articleNo.trim() : '',
            name: p.name.trim(),
            category: validCategories.has(p.category) ? p.category : '공용',
        }))

    return NextResponse.json({ parts: sanitized, pageCount: Math.ceil(pdfText.length / 3000) })
}
