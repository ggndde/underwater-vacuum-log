export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client'
import Link from 'next/link'
import { Users } from 'lucide-react'
import AddClientModal from './AddClientModal'

const prisma = new PrismaClient()

export default async function ClientsPage() {
    const customers = await prisma.customer.findMany({
        include: { machines: true },
        orderBy: { name: 'asc' },
    })

    return (
        <div className="max-w-4xl mx-auto p-4">
            <header className="mb-6 mt-2">
                <h1 className="text-3xl font-bold mb-4">거래처 목록</h1>
            </header>

            <div className="grid gap-3">
                {customers.map((customer: { id: number; name: string; address: string | null; machines: Array<{ id: number; modelName: string; serialNumber: string }> }) => (
                    <Link
                        key={customer.id}
                        href={`/clients/${customer.id}`}
                        className="block bg-white p-5 rounded-xl shadow-sm border border-slate-200 hover:border-blue-500 hover:shadow-md transition-all"
                    >
                        <div className="flex justify-between items-start">
                            <div className="flex-1">
                                <h2 className="font-bold text-xl text-slate-800">{customer.name}</h2>
                                {customer.address && (
                                    <p className="text-base text-slate-500 mt-1">{customer.address}</p>
                                )}
                            </div>
                            <div className="bg-slate-100 p-2.5 rounded-full ml-3 shrink-0">
                                <Users className="w-5 h-5 text-slate-600" />
                            </div>
                        </div>
                        {customer.machines.length > 0 && (
                            <div className="mt-3 pt-3 border-t border-slate-100">
                                <p className="text-xs font-semibold text-slate-400 uppercase mb-2">보유 장비</p>
                                {customer.machines.map((machine: { id: number; modelName: string; serialNumber: string }) => (
                                    <div key={machine.id} className="flex items-center text-base text-slate-700 mb-1">
                                        <span className="w-2 h-2 bg-green-500 rounded-full mr-2 shrink-0" />
                                        {machine.modelName} <span className="text-slate-400 mx-1.5">|</span> {machine.serialNumber}
                                    </div>
                                ))}
                            </div>
                        )}
                    </Link>
                ))}

                {customers.length === 0 && (
                    <div className="text-center py-16 text-slate-500 text-base bg-white rounded-xl border border-dashed border-slate-300">
                        <Users className="w-12 h-12 text-slate-300 mx-auto mb-3" />
                        <p className="font-medium">등록된 거래처가 없습니다.</p>
                        <p className="text-sm text-slate-400 mt-1">아래 버튼을 눌러 첫 거래처를 추가해보세요.</p>
                    </div>
                )}
            </div>

            <AddClientModal />
        </div>
    )
}
