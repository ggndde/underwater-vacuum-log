import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST(req: NextRequest) {
    const session = await getServerSession(authOptions)
    if (session?.user?.name !== '배근수') {
        return NextResponse.json({ error: '권한이 없습니다.' }, { status: 403 })
    }

    const results: string[] = []

    try {
        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "DiagramSheet" (
                "id" SERIAL NOT NULL,
                "name" TEXT NOT NULL,
                "drawingNo" TEXT,
                "category" TEXT NOT NULL DEFAULT '공용',
                "imageData" TEXT NOT NULL,
                "thumbnailData" TEXT,
                "mimeType" TEXT NOT NULL DEFAULT 'image/jpeg',
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "DiagramSheet_pkey" PRIMARY KEY ("id")
            )
        `)
        results.push('DiagramSheet 테이블: OK')

        await prisma.$executeRawUnsafe(`
            ALTER TABLE "DiagramSheet" ADD COLUMN IF NOT EXISTS "thumbnailData" TEXT
        `)
        results.push('DiagramSheet.thumbnailData 컬럼: OK')

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "DiagramHotspot" (
                "id" SERIAL NOT NULL,
                "diagramId" INTEGER NOT NULL,
                "articleNo" TEXT NOT NULL,
                "x" DOUBLE PRECISION NOT NULL,
                "y" DOUBLE PRECISION NOT NULL,
                "label" TEXT,
                CONSTRAINT "DiagramHotspot_pkey" PRIMARY KEY ("id")
            )
        `)
        results.push('DiagramHotspot 테이블: OK')

        try {
            await prisma.$executeRawUnsafe(`
                ALTER TABLE "DiagramHotspot" ADD CONSTRAINT "DiagramHotspot_diagramId_fkey"
                FOREIGN KEY ("diagramId") REFERENCES "DiagramSheet"("id") ON DELETE CASCADE ON UPDATE CASCADE
            `)
            results.push('DiagramHotspot 외래키: OK')
        } catch {
            results.push('DiagramHotspot 외래키: 이미 존재함 (OK)')
        }

        await prisma.$executeRawUnsafe(`
            CREATE TABLE IF NOT EXISTS "PartCatalog" (
                "id" SERIAL NOT NULL,
                "article" TEXT NOT NULL,
                "description" TEXT NOT NULL,
                "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
                CONSTRAINT "PartCatalog_pkey" PRIMARY KEY ("id")
            )
        `)
        results.push('PartCatalog 테이블: OK')

        await prisma.$executeRawUnsafe(`
            CREATE UNIQUE INDEX IF NOT EXISTS "PartCatalog_article_key" ON "PartCatalog"("article")
        `)
        results.push('PartCatalog 유니크 인덱스: OK')

        return NextResponse.json({ success: true, results })
    } catch (error: any) {
        return NextResponse.json({ error: error.message, results }, { status: 500 })
    }
}
