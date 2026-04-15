export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client'
import { NextRequest, NextResponse } from 'next/server'

const prisma = new PrismaClient()

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
    const id = parseInt(params.id)
    if (isNaN(id)) {
        return NextResponse.json({ error: '잘못된 ID입니다.' }, { status: 400 })
    }

    try {
        // 연결된 데이터 cascade 삭제 (Expense, Quote, ServiceLog, Machine 순)
        // Prisma SQLite는 cascade를 자동 처리하지 않으므로 수동 삭제
        const machines = await prisma.machine.findMany({ where: { customerId: id }, select: { id: true } })
        const machineIds = machines.map((m: { id: number }) => m.id)

        if (machineIds.length > 0) {
            const logs = await prisma.serviceLog.findMany({ where: { machineId: { in: machineIds } }, select: { id: true } })
            const logIds = logs.map((l: { id: number }) => l.id)

            if (logIds.length > 0) {
                await prisma.expense.deleteMany({ where: { serviceLogId: { in: logIds } } })
                await prisma.quote.deleteMany({ where: { serviceLogId: { in: logIds } } })
                await prisma.serviceLog.deleteMany({ where: { id: { in: logIds } } })
            }
            await prisma.machine.deleteMany({ where: { customerId: id } })
        }

        // Customer 직접 연결된 Quote, Expense 삭제
        await prisma.quote.deleteMany({ where: { customerId: id } })
        await prisma.expense.deleteMany({ where: { customerId: id } })

        await prisma.customer.delete({ where: { id } })

        return NextResponse.json({ success: true })
    } catch (error) {
        console.error('거래처 삭제 오류:', error)
        return NextResponse.json({ error: '거래처 삭제에 실패했습니다.' }, { status: 500 })
    }
}
