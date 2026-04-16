import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'
import sharp from 'sharp'

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

// ── Orientation detection prompt ──────────────────────────────────────────────
const ORIENT_PROMPT = `You are looking at a technical diagram image that may be rotated.

Determine which rotation is needed to make the image upright (readable normally, with text horizontal).

Return ONLY valid JSON:
{
  "rotation": 0
}

Where "rotation" is one of: 0, 90, 180, 270
- 0 = already upright, no rotation needed
- 90 = rotate 90° clockwise to fix
- 180 = rotate 180° to fix (upside down)
- 270 = rotate 270° clockwise (= 90° counter-clockwise) to fix

Hints:
- Look for title block text, part numbers, dimension numbers, or any readable text
- If text is readable left-to-right already, return 0
- If text runs bottom-to-top (rotated 90° CCW), return 90
- If text runs top-to-bottom (rotated 90° CW), return 270
- If text is upside-down, return 180`

// ── Hotspot detection prompt ──────────────────────────────────────────────────
const DETECT_PROMPT = `You are analyzing a technical parts diagram (exploded view drawing) from a pool cleaning equipment manufacturer.

Your task: find every Article Number (part number) in this image.

The image has been pre-rotated to be upright. All text should now be horizontal and readable.

Article numbers in this type of diagram are typically:
- 5 to 7 digit numbers (e.g. 122011, 118601, 122260, 124448)
- Sometimes prefixed with nothing, sometimes near arrows pointing to parts
- Often listed in a column on the left or right side, or along the edges
- Each number is associated with a part in the exploded view

For each article number found, estimate its center position as a percentage of the total image width (x) and height (y), measured from the top-left corner.

Return ONLY valid JSON in this exact format:
{
  "hotspots": [
    { "articleNo": "122011", "x": 23.5, "y": 45.2, "label": "DRIVE MOTOR COMPL" }
  ]
}

Rules:
- Include every part number you can find, even if you are not 100% certain
- x and y are coordinates (top-left = 0,0), values between 0 and 100
- label = nearby part description text, or "" if none
- Do NOT include drawing numbers, revision codes, dates, or company names
- Numbers like "10000676" (drawing number in title block) should be excluded`

async function detectOrientation(openai: OpenAI, dataUrl: string): Promise<number> {
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: ORIENT_PROMPT },
                    { type: 'image_url', image_url: { url: dataUrl, detail: 'low' } },
                ],
            }],
            response_format: { type: 'json_object' },
            max_tokens: 64,
            temperature: 0,
        })
        const content = response.choices[0].message.content ?? '{}'
        const parsed = JSON.parse(content)
        const rotation = Number(parsed.rotation)
        if ([0, 90, 180, 270].includes(rotation)) return rotation
    } catch (err) {
        console.error('방향 감지 오류:', err)
    }
    return 0
}

async function rotateImageBuffer(buffer: Buffer, mimeType: string, degrees: number): Promise<{ buffer: Buffer; mimeType: string }> {
    if (degrees === 0) return { buffer, mimeType }

    // sharp rotation: positive = clockwise
    // Convert to PNG after rotation (lossless, avoids JPEG re-compression artifacts)
    const png = Buffer.from(await sharp(buffer).rotate(degrees).png().toBuffer())
    return { buffer: png, mimeType: 'image/png' }
}

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

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Original buffer
    let buffer: Buffer = Buffer.from(await file.arrayBuffer())
    let finalMimeType = file.type

    // Step 1: detect orientation using a quick low-detail check
    const previewBase64 = buffer.toString('base64')
    const previewUrl = `data:${file.type};base64,${previewBase64}`
    const rotationNeeded = await detectOrientation(openai, previewUrl)

    // Step 2: rotate if needed
    if (rotationNeeded !== 0) {
        console.log(`이미지 자동 회전: ${rotationNeeded}°`)
        const result = await rotateImageBuffer(buffer, finalMimeType, rotationNeeded)
        buffer = result.buffer
        finalMimeType = result.mimeType
    }

    // Step 3: build final data URL from (possibly rotated) buffer
    const base64 = buffer.toString('base64')
    const dataUrl = `data:${finalMimeType};base64,${base64}`

    // Step 4: GPT-4o Vision hotspot detection on upright image
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
            mimeType: finalMimeType,
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

    return NextResponse.json({
        diagram,
        detectedCount: hotspots.length,
        rotated: rotationNeeded !== 0 ? rotationNeeded : null,
    }, { status: 201 })
}
