export const dynamic = 'force-dynamic'
import { prisma } from '@/lib/prisma'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { DiagramsClient } from './DiagramsClient'

export default async function DiagramsPage() {
    const [diagrams, session] = await Promise.all([
        (prisma as any).diagramSheet.findMany({
            orderBy: { createdAt: 'desc' },
            select: {
                id: true, name: true, drawingNo: true, category: true,
                mimeType: true, createdAt: true, thumbnailData: true,
                _count: { select: { hotspots: true } },
            },
        }),
        getServerSession(authOptions),
    ])

    const isMaster = session?.user?.name === '배근수'

    return (
        <div className="max-w-6xl mx-auto p-4 md:p-6 pb-24 sm:pb-6">
            <DiagramsClient initial={diagrams} isMaster={isMaster} />
        </div>
    )
}
