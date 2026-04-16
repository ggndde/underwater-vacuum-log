import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'

export const dynamic = 'force-dynamic'

// ── GET: list all diagrams (without image data for perf) ─────────────────────
export async function GET(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const diagrams = await (prisma as any).diagramSheet.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, name: true, drawingNo: true, category: true,
            mimeType: true, createdAt: true,
            _count: { select: { hotspots: true } },
        },
    })
    return NextResponse.json({ diagrams })
}

// ── POST: upload image + AI hotspot detection ─────────────────────────────────
const DETECT_PROMPT = `You are analyzing a technical parts diagram (exploded view drawing) from a pool cleaning equipment manufacturer.

Your task: find every Article Number (part number) in this image.

IMPORTANT: Text in these diagrams is often rotated 90 degrees sideways (especially along the left or right edge). You MUST read rotated text carefully.

Article numbers in this type of diagram are typically:
- 5 to 7 digit numbers (e.g. 122011, 118601, 122260, 124448)
- Sometimes prefixed with nothing, sometimes near arrows pointing to parts
- Often listed in a column on the left side of the image, rotated 90° counterclockwise
- Each number is associated with a part in the exploded view

For each article number found, estimate its center position as a percentage of the total image width (x) and height (y), measured from the top-left corner (before any rotation).

Return ONLY valid JSON in this exact format:
{
  "hotspots": [
    { "articleNo": "122011", "x": 23.5, "y": 45.2, "label": "DRIVE MOTOR COMPL" }
  ]
}

Rules:
- Read ALL rotated/sideways numbers carefully — this is critical
- Include every part number you can find, even if you are not 100% certain
- x and y are coordinates in the ORIGINAL image orientation (top-left = 0,0)
- label = nearby part description text, or "" if none
- Do NOT include drawing numbers, revision codes, dates, or company names
- Numbers like "10000676" (drawing number in title block) should be excluded`

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const formData = await req.formData()
    const file = formData.get('file') as File | null
    const name = (formData.get('name') as string)?.trim()
    const drawingNo = (formData.get('drawingNo') as string)?.trim() || null
    const category = (formData.get('category') as string) || '공용'

    if (!file) return NextResponse.json({ error: '이미지 파일을 업로드해 주세요.' }, { status: 400 })
    if (!name) return NextResponse.json({ error: '도면 이름을 입력해 주세요.' }, { status: 400 })

    const allowedTypes = ['image/jpeg', 'image/png', 'image/webp']
    if (!allowedTypes.includes(file.type)) {
        return NextResponse.json({ error: 'JPG, PNG, WEBP 이미지만 지원합니다. (PDF는 이미지로 변환 후 업로드)' }, { status: 400 })
    }
    if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json({ error: '파일 크기는 15MB 이하여야 합니다.' }, { status: 400 })
    }

    // Convert to base64 data URL
    const buffer = Buffer.from(await file.arrayBuffer())
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${file.type};base64,${base64}`

    // GPT-4o Vision: detect hotspots
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })
    let hotspots: Array<{ articleNo: string; x: number; y: number; label: string }> = []

    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: DETECT_PROMPT },
                    { type: 'image_url', image_url: { url: dataUrl, detail: 'high' } },
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
            .filter(h => typeof h.articleNo === 'string' && h.articleNo.match(/^\d{4,10}$/))
            .map(h => ({
                articleNo: String(h.articleNo).trim(),
                x: Math.min(100, Math.max(0, Number(h.x) || 0)),
                y: Math.min(100, Math.max(0, Number(h.y) || 0)),
                label: typeof h.label === 'string' ? h.label.trim() : '',
            }))
    } catch (err) {
        console.error('GPT-4o 감지 오류:', err)
        // Save image without hotspots — user can re-detect later
    }

    // Save to DB
    const diagram = await (prisma as any).diagramSheet.create({
        data: {
            name,
            drawingNo,
            category,
            imageData: dataUrl,
            mimeType: file.type,
            hotspots: {
                create: hotspots.map(h => ({
                    articleNo: h.articleNo,
                    x: h.x,
                    y: h.y,
                    label: h.label || null,
                })),
            },
        },
        include: { hotspots: true },
    })

    return NextResponse.json({ diagram, detectedCount: hotspots.length }, { status: 201 })
}
