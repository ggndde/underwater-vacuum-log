import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'
import { readFileSync } from 'fs'
import { join } from 'path'

export const dynamic = 'force-dynamic'

const openai = new OpenAI()

const OPS = {
    setFillRGBColor: 59,
    setFillGray: 57,
    setFillCMYKColor: 61,
    beginText: 31,
    endText: 32,
    showText: 44,
    showSpacedText: 45,
    nextLine: 43,
    nextLineShowText: 46,
    nextLineSetSpacingShowText: 47,
}

function isGreen(r: number, g: number, b: number): boolean {
    return g > 0.25 && r < 0.45 && b < 0.45
}

function glyphsToString(glyphs: any[]): string {
    return glyphs
        .map((g: any) => {
            if (typeof g === 'number') return g < 0 ? ' ' : ''
            if (g && typeof g.unicode === 'string') return g.unicode
            if (g && typeof g.fontChar === 'string') return g.fontChar
            return ''
        })
        .join('')
}

let workerSrc: string | null = null

function getWorkerSrc(): string {
    if (!workerSrc) {
        const workerPath = join(process.cwd(), 'node_modules/pdfjs-dist/legacy/build/pdf.worker.min.mjs')
        const data = readFileSync(workerPath).toString('base64')
        workerSrc = `data:text/javascript;base64,${data}`
    }
    return workerSrc
}

async function extractGreenLines(buffer: Buffer): Promise<string[]> {
    // Dynamic import avoids webpack bundling pdfjs-dist (which includes browser-only APIs)
    const pdfjs = await import('pdfjs-dist/legacy/build/pdf.mjs' as string)
    pdfjs.GlobalWorkerOptions.workerSrc = getWorkerSrc()

    const doc = await pdfjs.getDocument({
        data: new Uint8Array(buffer),
        useSystemFonts: true,
        disableFontFace: true,
        verbosity: 0,
    }).promise

    const greenLines: string[] = []

    for (let pageNum = 1; pageNum <= doc.numPages; pageNum++) {
        const page = await doc.getPage(pageNum)
        const opList = await page.getOperatorList()

        let fillR = 0, fillG = 0, fillB = 0
        let lineBuffer = ''
        let lineIsGreen = false

        const flushLine = () => {
            const trimmed = lineBuffer.trim()
            if (lineIsGreen && trimmed) greenLines.push(trimmed)
            lineBuffer = ''
        }

        const updateGreen = () => { lineIsGreen = isGreen(fillR, fillG, fillB) }

        for (let i = 0; i < opList.fnArray.length; i++) {
            const fn = opList.fnArray[i]
            const args = opList.argsArray[i]

            switch (fn) {
                case OPS.setFillRGBColor:
                    fillR = args[0]; fillG = args[1]; fillB = args[2]
                    updateGreen()
                    break
                case OPS.setFillGray:
                    fillR = fillG = fillB = args[0]
                    updateGreen()
                    break
                case OPS.setFillCMYKColor: {
                    const [c, m, y, k] = args
                    fillR = (1 - c) * (1 - k)
                    fillG = (1 - m) * (1 - k)
                    fillB = (1 - y) * (1 - k)
                    updateGreen()
                    break
                }
                case OPS.beginText:
                    lineBuffer = ''
                    lineIsGreen = isGreen(fillR, fillG, fillB)
                    break
                case OPS.endText:
                    flushLine()
                    break
                case OPS.nextLine:
                    flushLine()
                    break
                case OPS.showText:
                    if (lineIsGreen && Array.isArray(args[0])) lineBuffer += glyphsToString(args[0])
                    break
                case OPS.showSpacedText:
                    if (lineIsGreen && Array.isArray(args[0])) lineBuffer += glyphsToString(args[0])
                    break
                case OPS.nextLineShowText:
                    flushLine()
                    if (lineIsGreen && Array.isArray(args[0])) lineBuffer = glyphsToString(args[0])
                    break
                case OPS.nextLineSetSpacingShowText:
                    flushLine()
                    if (lineIsGreen && Array.isArray(args[2])) lineBuffer = glyphsToString(args[2])
                    break
            }
        }

        flushLine()
    }

    return greenLines.filter(l => l.length > 0)
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const fd = await req.formData()
    const file = fd.get('file') as File | null
    if (!file) return NextResponse.json({ error: '파일이 없습니다.' }, { status: 400 })

    const buffer = Buffer.from(await file.arrayBuffer())

    let greenLines: string[]
    try {
        greenLines = await extractGreenLines(buffer)
    } catch (e: any) {
        return NextResponse.json({ error: `PDF 파싱 실패: ${e?.message ?? e}` }, { status: 400 })
    }

    if (greenLines.length === 0) {
        return NextResponse.json({ error: '초록색 텍스트를 찾을 수 없습니다. PDF가 올바르게 내보내졌는지 확인하세요.' }, { status: 400 })
    }

    const response = await openai.chat.completions.create({
        model: 'gpt-4o',
        messages: [{
            role: 'user',
            content: `아래는 고객 관리카드 PDF에서 초록색 텍스트만 추출한 결과입니다.
각 항목은 교체 기록이며, 가장 왼쪽에 날짜가 있습니다.
날짜와 교체 내용을 분리해서 JSON으로 반환하세요.

반환 형식 (JSON만, 설명 없이):
{"history": [{"date": "날짜 원문", "content": "내용 원문 (날짜 제외)"}]}

규칙:
- 날짜 기준 오래된 순서로 정렬
- 날짜가 불명확하면 원문 그대로 사용
- 빈 항목은 제외

추출된 초록색 텍스트:
${greenLines.join('\n')}`
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
