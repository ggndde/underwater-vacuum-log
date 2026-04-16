export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import ExpenseForm from './ExpenseForm';

export default async function ExpensePage({ params }: { params: { id: string; logId: string } }) {
    const customerId = parseInt(params.id);
    const logId = parseInt(params.logId);
    if (isNaN(customerId) || isNaN(logId)) return notFound();

    const log = await prisma.serviceLog.findUnique({
        where: { id: logId },
        include: {
            machine: { include: { customer: true } },
            quote: true,
            expense: true,
        },
    });
    if (!log) return notFound();

    return (
        <div className="max-w-2xl mx-auto p-4">
            <header className="mb-6 flex items-center gap-3">
                <Link href={`/clients/${customerId}/logs/${logId}/photos`} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-700" />
                </Link>
                <div>
                    <p className="text-xs text-slate-500 font-medium">Step 4 / 4 · {log.machine.customer.name} {log.machine.unitNo}호기</p>
                    <h1 className="text-xl font-bold text-slate-900">지출현황 작성</h1>
                </div>
            </header>

            <ExpenseForm
                customerId={customerId}
                serviceLogId={logId}
                quoteId={log.quote?.id ?? null}
                grandTotal={log.quote?.grandTotal ?? null}
                existingExpense={log.expense}
            />
        </div>
    );
}
