import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const ORIENT_PROMPT = `This is a technical engineering diagram that may be rotated. Your job is to determine how many degrees clockwise the image must be rotated to make it upright.

An upright diagram:
- Has a title block (table with drawing number, date, company name) in the BOTTOM-RIGHT corner
- Has readable left-to-right horizontal text throughout
- Part numbers and labels are horizontal, not sideways

Step 1: Find the title block (a bordered table, usually in a corner, containing a drawing number like "10000676" and a date like "22.06.2019").
Step 2: Determine which corner the title block is currently in.
Step 3: Decide the clockwise rotation needed so the title block ends up in the bottom-right.

Title block location → rotation needed:
- Bottom-right already → 0 (already upright)
- Bottom-left → 90 (rotate 90° CW)
- Top-right → 270 (rotate 270° CW)
- Top-left → 180 (rotate 180°)

If there is no visible title block, look for any readable text and choose the rotation that makes the text read left-to-right.

Return ONLY valid JSON, nothing else:
{"rotation": 0}`

const DETECT_PROMPT = `You are analyzing a technical parts diagram (exploded view drawing) from a pool cleaning equipment manufacturer.

Your task: find every Article Number (part number) in this image.

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

    // Decode stored image to buffer
    const base64Data = diagram.imageData.split(',')[1]
    let buffer = Buffer.from(base64Data, 'base64')
    let currentDataUrl: string = diagram.imageData
    let rotated = 0

    // Step 1: Detect orientation using a 1200px thumbnail with detail: 'high'
    try {
        const thumb = Buffer.from(
            await sharp(buffer)
                .resize(1200, 1200, { fit: 'inside', withoutEnlargement: true })
                .png()
                .toBuffer()
        )
        const thumbUrl = `data:image/png;base64,${thumb.toString('base64')}`

        const orientRes = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: ORIENT_PROMPT },
                    { type: 'image_url', image_url: { url: thumbUrl, detail: 'high' } },
                ],
            }],
            response_format: { type: 'json_object' },
            max_tokens: 128,
            temperature: 0,
        })
        const orientContent = orientRes.choices[0].message.content ?? '{}'
        const orientParsed = JSON.parse(orientContent)
        const rotation = Number(orientParsed.rotation)
        console.log(`재탐지 - 방향 감지 결과: ${rotation}°`)
        if ([0, 90, 180, 270].includes(rotation)) rotated = rotation
    } catch (err) {
        console.error('방향 감지 오류:', err)
    }

    // Step 2: Rotate image if needed, update DB
    if (rotated !== 0) {
        try {
            console.log(`재탐지 - 이미지 자동 회전: ${rotated}°`)
            buffer = Buffer.from(await sharp(buffer).rotate(rotated).png().toBuffer())
            currentDataUrl = `data:image/png;base64,${buffer.toString('base64')}`

            await (prisma as any).diagramSheet.update({
                where: { id },
                data: { imageData: currentDataUrl, mimeType: 'image/png' },
            })
        } catch (err) {
            console.error('이미지 회전 오류:', err)
            rotated = 0
        }
    }

    // Step 3: Detect hotspots on (possibly rotated) image
    let hotspots: Array<{ articleNo: string; x: number; y: number; label: string }> = []
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: DETECT_PROMPT },
                    { type: 'image_url', image_url: { url: currentDataUrl, detail: 'high' } },
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
        console.error('GPT-4o 재탐지 오류:', err)
        return NextResponse.json({ error: 'AI 분석 중 오류가 발생했습니다.' }, { status: 500 })
    }

    // Step 4: Replace all hotspots
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

    return NextResponse.json({
        detectedCount: hotspots.length,
        rotated: rotated !== 0 ? rotated : null,
    })
}
