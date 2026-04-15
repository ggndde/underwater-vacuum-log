export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import MachineForm from './MachineForm';

const prisma = new PrismaClient();

export default async function MachinePage({ params }: { params: { id: string; machineId: string } }) {
    const customerId = parseInt(params.id);
    const machineId = params.machineId === 'new' ? null : parseInt(params.machineId);
    if (isNaN(customerId)) return notFound();

    const customer = await prisma.customer.findUnique({ where: { id: customerId } });
    if (!customer) return notFound();

    const machine = machineId
        ? await prisma.machine.findUnique({ where: { id: machineId } })
        : null;

    if (machineId && !machine) return notFound();

    return (
        <div className="max-w-2xl mx-auto p-4">
            <header className="mb-6 flex items-center gap-3">
                <Link href={`/clients/${customerId}`} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-700" />
                </Link>
                <div>
                    <p className="text-xs text-slate-500">{customer.name}</p>
                    <h1 className="text-xl font-bold text-slate-900">
                        {machine ? '장비 편집' : '장비 추가'}
                    </h1>
                </div>
            </header>

            <MachineForm customerId={customerId} machine={machine} />
        </div>
    );
}
