import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

type PartInput = {
    articleNo: string
    name: string
    category: string
    stock?: number
}

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const body = await req.json()
    const parts: PartInput[] = body.parts

    if (!Array.isArray(parts) || parts.length === 0) {
        return NextResponse.json({ error: '등록할 부품이 없습니다.' }, { status: 400 })
    }

    const validCategories = new Set(['CP', 'PP', 'NV3', '공용'])

    // Deduplicate by articleNo within the incoming list (keep last occurrence)
    const deduped = new Map<string, PartInput>()
    for (const p of parts) {
        const name = (p.name ?? '').trim()
        if (!name) continue
        // Use articleNo as key if provided, otherwise use name
        const key = p.articleNo?.trim() || `__name__${name}`
        deduped.set(key, {
            articleNo: p.articleNo?.trim() || '',
            name,
            category: validCategories.has(p.category) ? p.category : '공용',
            stock: typeof p.stock === 'number' && p.stock >= 0 ? p.stock : 0,
        })
    }

    const toInsert = Array.from(deduped.values())

    // Parts with an articleNo use upsert-style createMany (skipDuplicates)
    // Parts without articleNo can't be uniquely identified by Prisma schema (articleNo is @unique),
    // so we generate a placeholder key.
    const withKey = toInsert.map((p) => ({
        ...p,
        // Generate a placeholder articleNo if missing so the DB unique constraint is satisfied
        articleNo: p.articleNo || `IMPORT-${Date.now()}-${Math.random().toString(36).slice(2, 7).toUpperCase()}`,
    }))

    const result = await prisma.part.createMany({
        data: withKey,
        skipDuplicates: true, // skip rows where articleNo already exists
    })

    return NextResponse.json({ created: result.count, total: withKey.length })
}
