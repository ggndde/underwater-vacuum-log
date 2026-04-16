export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma'
import { DeliveryCalendar } from './DeliveryCalendar'
import { Truck } from 'lucide-react'

export default async function DeliveryPage() {
    // Fetch employee names for autocomplete
    const employees = await prisma.employee.findMany({ select: { name: true } })
    const employeeNames = employees.map((e: { name: string }) => e.name)

    return (
        <div className="max-w-7xl mx-auto p-4 md:p-8">
            <header className="mb-6">
                <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
                    <Truck className="w-6 h-6 text-blue-600" />
                    납품 캘린더
                </h1>
                <p className="text-sm text-slate-500 mt-1">월간 제품 납품 일정을 관리합니다</p>
            </header>

            <DeliveryCalendar employees={employeeNames} />
        </div>
    )
}
