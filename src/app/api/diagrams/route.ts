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
            mimeType: true, createdAt: true, thumbnailData: true,
            _count: { select: { hotspots: true } },
        },
    })
    return NextResponse.json({ diagrams })
}

// ── Orientation detection prompt ──────────────────────────────────────────────
const ORIENT_PROMPT = `You are shown 4 versions of the same technical engineering diagram, each rotated differently:
- Image 1: 0° (original as uploaded)
- Image 2: 90° clockwise
- Image 3: 180°
- Image 4: 270° clockwise

Select the version that is CORRECTLY oriented (upright). In the correct orientation:
- Text reads left-to-right horizontally
- The title block (bordered table with drawing number, revision letter, date) is in the BOTTOM-RIGHT corner
- Part numbers and labels are readable without tilting your head

Return ONLY valid JSON:
{"correct": 1}

Where the number is 1, 2, 3, or 4 corresponding to the image that is upright.`

async function makeThumbnail(buffer: Buffer): Promise<string> {
    const thumb = Buffer.from(
        await sharp(buffer)
            .resize(400, 400, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 55 })
            .toBuffer()
    )
    return `data:image/jpeg;base64,${thumb.toString('base64')}`
}

async function detectOrientation(openai: OpenAI, buffer: Buffer): Promise<number> {
    try {
        const rotations = [0, 90, 180, 270]
        const thumbUrls = await Promise.all(rotations.map(async (deg) => {
            const rotBuf = Buffer.from(
                await sharp(buffer)
                    .rotate(deg)
                    .resize(600, 600, { fit: 'inside', withoutEnlargement: true })
                    .png()
                    .toBuffer()
            )
            return `data:image/png;base64,${rotBuf.toString('base64')}`
        }))

        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: ORIENT_PROMPT },
                    { type: 'image_url', image_url: { url: thumbUrls[0], detail: 'low' } },
                    { type: 'image_url', image_url: { url: thumbUrls[1], detail: 'low' } },
                    { type: 'image_url', image_url: { url: thumbUrls[2], detail: 'low' } },
                    { type: 'image_url', image_url: { url: thumbUrls[3], detail: 'low' } },
                ],
            }],
            response_format: { type: 'json_object' },
            max_tokens: 64,
            temperature: 0,
        })
        const content = response.choices[0].message.content ?? '{}'
        const parsed = JSON.parse(content)
        const correct = Number(parsed.correct)
        const rotation = rotations[(correct - 1)] ?? 0
        console.log(`방향 감지 결과: 이미지${correct} 선택 → ${rotation}° 회전 필요`)
        if (correct >= 1 && correct <= 4) return rotation
    } catch (err) {
        console.error('방향 감지 오류:', err)
    }
    return 0
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
        return NextResponse.json({ error: 'JPG, PNG, WEBP 이미지만 지원합니다.' }, { status: 400 })
    }
    if (file.size > 15 * 1024 * 1024) {
        return NextResponse.json({ error: '파일 크기는 15MB 이하여야 합니다.' }, { status: 400 })
    }

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    // Apply EXIF auto-rotation and normalize to PNG
    const finalMimeType = 'image/png'
    let buffer: Buffer = Buffer.from(
        await sharp(Buffer.from(await file.arrayBuffer())).rotate().png().toBuffer()
    )

    // GPT-4o orientation check — pick the upright rotation from 4 thumbnails
    const rotationNeeded = await detectOrientation(openai, buffer)
    if (rotationNeeded !== 0) {
        console.log(`이미지 자동 회전: ${rotationNeeded}°`)
        buffer = Buffer.from(await sharp(buffer).rotate(rotationNeeded).png().toBuffer())
    }

    const dataUrl = `data:${finalMimeType};base64,${buffer.toString('base64')}`
    const thumbnailData = await makeThumbnail(buffer)

    const diagram = await (prisma as any).diagramSheet.create({
        data: { name, drawingNo, category, imageData: dataUrl, thumbnailData, mimeType: finalMimeType },
    })

    return NextResponse.json({ diagram }, { status: 201 })
}
