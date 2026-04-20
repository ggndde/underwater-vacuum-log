export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { DiagramsClient } from './DiagramsClient'

export default async function DiagramsPage() {
    const diagrams = await (prisma as any).diagramSheet.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
            id: true, name: true, drawingNo: true, category: true,
            mimeType: true, createdAt: true, thumbnailData: true,
            _count: { select: { hotspots: true } },
        },
    })

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24 sm:pb-6">
            <DiagramsClient initial={diagrams} />
        </div>
    )
}
