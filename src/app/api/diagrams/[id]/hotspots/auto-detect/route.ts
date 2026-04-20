import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import OpenAI from 'openai'
import sharp from 'sharp'

export const dynamic = 'force-dynamic'

const DETECT_PROMPT = `You are analyzing a technical engineering parts diagram.
Your task: find every 6-digit article/part number visible in the image.

Rules:
- Part numbers are EXACTLY 6 digits (100000–999999 range)
- They appear as standalone numbers, often with leader lines pointing to parts
- Ignore: page numbers, dates (e.g. 19.02.2019), revision codes, dimension values, drawing numbers, 5-digit or 7-digit+ numbers
- Include ALL 6-digit numbers you can find anywhere in the image

Return ONLY valid JSON in this exact format:
{"articles": ["123456", "789012", "345678"]}`

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })

    const id = parseInt(params.id)
    if (isNaN(id)) return NextResponse.json({ error: 'Invalid id' }, { status: 400 })

    const diagram = await (prisma as any).diagramSheet.findUnique({
        where: { id },
        select: { imageData: true },
    })
    if (!diagram) return NextResponse.json({ error: '도면을 찾을 수 없습니다.' }, { status: 404 })

    // Resize to max 1600px for OCR quality vs cost balance
    const base64Data = diagram.imageData.split(',')[1]
    const resized = Buffer.from(
        await sharp(Buffer.from(base64Data, 'base64'))
            .resize(1600, 1600, { fit: 'inside', withoutEnlargement: true })
            .jpeg({ quality: 85 })
            .toBuffer()
    )
    const imageUrl = `data:image/jpeg;base64,${resized.toString('base64')}`

    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

    let detected: string[] = []
    try {
        const response = await openai.chat.completions.create({
            model: 'gpt-4o',
            messages: [{
                role: 'user',
                content: [
                    { type: 'text', text: DETECT_PROMPT },
                    { type: 'image_url', image_url: { url: imageUrl, detail: 'high' } },
                ],
            }],
            response_format: { type: 'json_object' },
            max_tokens: 512,
            temperature: 0,
        })
        const content = response.choices[0].message.content ?? '{}'
        const parsed = JSON.parse(content)
        const raw: unknown[] = Array.isArray(parsed.articles) ? parsed.articles : []
        // Validate: exactly 6 digits each
        detected = raw
            .map((v: unknown) => String(v).trim())
            .filter((v: string) => /^\d{6}$/.test(v))
        // Deduplicate
        detected = Array.from(new Set(detected))
    } catch (err) {
        console.error('Auto-detect error:', err)
        return NextResponse.json({ error: 'AI 감지 실패' }, { status: 500 })
    }

    if (detected.length === 0) {
        return NextResponse.json({ added: 0, skipped: 0, articles: [] })
    }

    // Get already-registered hotspots for this diagram
    const existing = await (prisma as any).diagramHotspot.findMany({
        where: { diagramId: id },
        select: { articleNo: true },
    })
    const existingSet = new Set(existing.map((h: any) => h.articleNo))

    const toAdd = detected.filter((a: string) => !existingSet.has(a))
    const skipped = detected.length - toAdd.length

    // Enrich with catalog descriptions
    let catalog: Record<string, string> = {}
    try {
        const parts = await (prisma as any).partCatalog.findMany({
            where: { article: { in: toAdd } },
            select: { article: true, description: true },
        })
        catalog = Object.fromEntries(parts.map((p: any) => [p.article, p.description]))
    } catch { /* ignore */ }

    if (toAdd.length > 0) {
        await (prisma as any).diagramHotspot.createMany({
            data: toAdd.map((articleNo: string) => ({
                diagramId: id,
                articleNo,
                label: catalog[articleNo] ?? null,
                x: 0,
                y: 0,
            })),
            skipDuplicates: true,
        })
    }

    // Return all hotspots for this diagram (including newly added)
    const allHotspots = await (prisma as any).diagramHotspot.findMany({
        where: { diagramId: id },
        orderBy: { articleNo: 'asc' },
    })
    const allArticles = allHotspots.map((h: any) => h.articleNo)
    let fullCatalog: Record<string, string> = {}
    try {
        const parts = await (prisma as any).partCatalog.findMany({
            where: { article: { in: allArticles } },
            select: { article: true, description: true },
        })
        fullCatalog = Object.fromEntries(parts.map((p: any) => [p.article, p.description]))
    } catch { /* ignore */ }

    return NextResponse.json({
        added: toAdd.length,
        skipped,
        articles: toAdd,
        hotspots: allHotspots.map((h: any) => ({
            ...h,
            description: fullCatalog[h.articleNo] ?? h.label ?? null,
        })),
    })
}
