export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import type { Part } from '@prisma/client'
import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Tag } from 'lucide-react'
import { DiagramViewer } from './DiagramViewer'

export default async function DiagramDetailPage({ params }: { params: { id: string } }) {
    const id = parseInt(params.id)
    if (isNaN(id)) notFound()

    const diagram = await (prisma as any).diagramSheet.findUnique({
        where: { id },
        include: { hotspots: true },
    })
    if (!diagram) notFound()

    // Enrich hotspots with part data
    const articleNos = Array.from(new Set((diagram.hotspots as any[]).map((h: any) => h.articleNo))) as string[]
    const parts = articleNos.length > 0
        ? await prisma.part.findMany({ where: { articleNo: { in: articleNos } } })
        : []
    const partMap = new Map<string, Part>(parts.map((p: Part) => [p.articleNo, p]))

    const enriched = {
        ...diagram,
        imageData: undefined, // don't pass to client (served via /api/diagrams/[id]/image)
        hotspots: (diagram.hotspots as any[]).map((h: any) => ({
            id: h.id,
            articleNo: h.articleNo,
            x: h.x,
            y: h.y,
            label: h.label,
            part: partMap.get(h.articleNo) ?? null,
        })),
    }

    return (
        <div className="flex flex-col h-screen">
            {/* Header */}
            <div className="flex items-center gap-3 px-4 py-3 bg-white border-b border-slate-200 shrink-0">
                <Link href="/diagrams" className="flex items-center gap-1 text-sm text-slate-500 hover:text-slate-800 transition-colors">
                    <ChevronLeft className="w-4 h-4" />
                    도면 목록
                </Link>
                <span className="text-slate-300">/</span>
                <h1 className="font-bold text-slate-800 truncate">{diagram.name}</h1>
                {diagram.drawingNo && (
                    <span className="flex items-center gap-1 text-xs text-slate-400 shrink-0">
                        <Tag className="w-3 h-3" />{diagram.drawingNo}
                    </span>
                )}
            </div>

            {/* Viewer fills remaining space */}
            <div className="flex-1 overflow-hidden">
                <DiagramViewer diagram={enriched} />
            </div>
        </div>
    )
}
