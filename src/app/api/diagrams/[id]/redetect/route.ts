import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

const DETECT_PROMPT = `You are analyzing a technical parts diagram (exploded view drawing).
Find every Article Number visible in this image. Article numbers are typically 5-6 digit numbers.
For each one, estimate its center position as a percentage of the total image width (x) and height (y), measured from the top-left corner.
Also capture any part description text written near that number (e.g. "DRIVE MOTOR COMPL", "PUMP CPL").

Return ONLY valid JSON in this exact format:
{
  "hotspots": [
    { "articleNo": "123456", "x": 23.5, "y": 45.2, "label": "DRIVE MOTOR COMPL" }
  ]
}

Rules:
- Include every distinct article number you can see
- If the same number appears multiple times (e.g. screws), list each occurrence separately
- x and y must be between 0 and 100
- label can be empty string "" if no description is nearby
- Do not include drawing titles, company names, or non-article text`

export async function POST(_req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })

    const diagram = await (prisma as any).diagramSheet.findUnique({
        where: { id },
        select: { id: true, imageData: true, mimeType: true },
    })
    if (!diagram) return NextResponse.json({ error: '도면을 찾을 수 없습니다.' }, { status: 404 })

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    let hotspots: Array<{ articleNo: string; x: number; y: number; label: string }> = []
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: DETECT_PROMPT },
                    { type: 'image_url', image_url: { url: diagram.imageData, detail: 'high' } },
                ],
            }],
            response_format: { type: 'json_object' },
            max_tokens: 4096,
            temperature: 0.1,
        })

        const content = response.choices[0].message.content ?? '{}'
        const parsed = JSON.parse(content)
        const raw: Array<{ articleNo: unknown; x: unknown; y: unknown; label?: unknown }> =
            Array.isArray(parsed.hotspots) ? parsed.hotspots : []

        hotspots = raw
            .filter(h => typeof h.articleNo === 'string' && h.articleNo.match(/^\d{4,8}$/))
            .map(h => ({
                articleNo: String(h.articleNo).trim(),
                x: Math.min(100, Math.max(0, Number(h.x) || 0)),
                y: Math.min(100, Math.max(0, Number(h.y) || 0)),
                label: typeof h.label === 'string' ? h.label.trim() : '',
            }))
    } catch (err) {
        console.error('GPT-4o 재탐지 오류:', err)
        return NextResponse.json({ error: 'AI 분석 중 오류가 발생했습니다.' }, { status: 500 })
    }

    // Replace all hotspots
    await (prisma as any).diagramHotspot.deleteMany({ where: { diagramId: id } })
    if (hotspots.length > 0) {
        await (prisma as any).diagramHotspot.createMany({
            data: hotspots.map(h => ({
                diagramId: id,
                articleNo: h.articleNo,
                x: h.x,
                y: h.y,
                label: h.label || null,
            })),
        })
    }

    return NextResponse.json({ detectedCount: hotspots.length })
}
