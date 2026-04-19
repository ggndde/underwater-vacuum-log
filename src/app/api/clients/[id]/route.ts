export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma'
import { NextRequest, NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const session = await getServerSession(authOptions)
    if (!session?.user?.name) {
        return NextResponse.json({ error: '로그인이 필요합니다.' }, { status: 401 })
    }

    const id = parseInt(params.id)
    if (isNaN(id)) {
        return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })
    }

    try {
        await (prisma as any).$transaction(async (tx: any) => {
            const machines = await tx.machine.findMany({ where: { customerId: id }, select: { id: true } })
            const machineIds = machines.map((m: { id: number }) => m.id)

            if (machineIds.length > 0) {
                const logs = await tx.serviceLog.findMany({ where: { machineId: { in: machineIds } }, select: { id: true } })
                const logIds = logs.map((l: { id: number }) => l.id)

                if (logIds.length > 0) {
                    await tx.expense.deleteMany({ where: { serviceLogId: { in: logIds } } })
                    await tx.quote.deleteMany({ where: { serviceLogId: { in: logIds } } })
                    await tx.serviceLog.deleteMany({ where: { id: { in: logIds } } })
                }
                await tx.machine.deleteMany({ where: { customerId: id } })
            }

            await tx.quote.deleteMany({ where: { customerId: id } })
            await tx.expense.deleteMany({ where: { customerId: id } })
            await tx.customer.delete({ where: { id } })
        })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('거래처 삭제 오류:', error)
        return NextResponse.json({ error: '거래처 삭제에 실패했습니다.' }, { status: 500 })
    }
}
