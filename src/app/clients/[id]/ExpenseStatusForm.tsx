'use client';

import { updateExpenseStatus } from '@/app/actions';

export default function ExpenseStatusForm({
    expenseId,
    customerId,
    nextStatus,
}: {
    expenseId: number;
    customerId: number;
    nextStatus: '청구' | '완납';
}) {
    const label = nextStatus === '청구' ? '청구로 변경' : '완납 처리';
    const color = nextStatus === '완납'
        ? 'bg-green-600 text-white hover:bg-green-700'
        : 'bg-yellow-500 text-white hover:bg-yellow-600';

    return (
        <form action={updateExpenseStatus}>
            <input type="hidden" name="expenseId" value={expenseId} />
            <input type="hidden" name="customerId" value={customerId} />
            <input type="hidden" name="status" value={nextStatus} />
            <button type="submit"
                className={`text-xs px-2 py-0.5 rounded-full font-bold transition-colors ${color}`}>
                → {label}
            </button>
        </form>
    );
}
