export const dynamic = 'force-dynamic';
import { notFound } from 'next/navigation';
import LogForm from './LogForm';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

export default async function NewLogPage({ params }: { params: { id: string } }) {
    const id = parseInt(params.id);
    if (isNaN(id)) return notFound();

    const machines = await prisma.machine.findMany({ where: { customerId: id } });

    return (
        <div className="max-w-4xl mx-auto p-4">
            <header className="mb-6 flex items-center">
                <Link href={`/clients/${id}`} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors mr-2">
                    <ArrowLeft className="w-6 h-6 text-slate-700" />
                </Link>
                <h1 className="text-xl font-bold text-slate-900">새 서비스 기록 작성</h1>
            </header>

            <LogForm customerId={id} machines={machines} />
        </div>
    );
}
