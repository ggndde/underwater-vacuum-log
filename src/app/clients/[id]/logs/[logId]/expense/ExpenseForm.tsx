'use client';

import { useState } from 'react';
import { createExpense } from '@/app/actions';
import { Save, CreditCard, FileText, Building2, Gift } from 'lucide-react';

type ExistingExpense = {
    id: number;
    amount: number;
    paymentType: string;
    status: string;
    memo: string | null;
} | null;

const PAYMENT_TYPES = [
    { value: '세금계산서', label: '세금계산서', icon: FileText, desc: '나중에 세금계산서 발행' },
    { value: '현장카드결제', label: '현장 카드결제', icon: CreditCard, desc: '즉시 완납 처리' },
    { value: '무통장', label: '무통장입금', icon: Building2, desc: '계좌이체 후 확인' },
    { value: '무상', label: '무상', icon: Gift, desc: '청구 없음 (0원)' },
];

export default function ExpenseForm({
    customerId,
    serviceLogId,
    quoteId,
    grandTotal,
    existingExpense,
}: {
    customerId: number;
    serviceLogId: number;
    quoteId: number | null;
    grandTotal: number | null;
    existingExpense: ExistingExpense;
}) {
    const [paymentType, setPaymentType] = useState(existingExpense?.paymentType || '세금계산서');
    const [amount, setAmount] = useState(existingExpense?.amount ?? grandTotal ?? 0);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const isFree = paymentType === '무상';
    const isAutoComplete = paymentType === '현장카드결제' || isFree;

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        await createExpense(new FormData(e.currentTarget));
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pb-28">
            <input type="hidden" name="serviceLogId" value={serviceLogId} />
            <input type="hidden" name="customerId" value={customerId} />
            {quoteId && <input type="hidden" name="quoteId" value={quoteId} />}

            {existingExpense && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                    이미 지출현황이 등록되어 있습니다. 상태: <strong>{existingExpense.status}</strong>
                </div>
            )}

            {/* 결제 방식 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-slate-800">결제 방식</h3>
                <div className="grid grid-cols-2 gap-2">
                    {PAYMENT_TYPES.map(({ value, label, icon: Icon, desc }) => (
                        <button
                            key={value}
                            type="button"
                            onClick={() => {
                                setPaymentType(value);
                                if (value === '무상') setAmount(0);
                                else if (grandTotal !== null) setAmount(grandTotal);
                            }}
                            className={`p-3 rounded-xl border-2 text-left transition-all ${paymentType === value
                                    ? 'border-blue-500 bg-blue-50'
                                    : 'border-slate-200 hover:border-slate-300'
                                }`}
                        >
                            <div className="flex items-center gap-2 mb-1">
                                <Icon className={`w-4 h-4 ${paymentType === value ? 'text-blue-600' : 'text-slate-400'}`} />
                                <span className={`text-sm font-bold ${paymentType === value ? 'text-blue-700' : 'text-slate-700'}`}>
                                    {label}
                                </span>
                            </div>
                            <p className="text-xs text-slate-500">{desc}</p>
                        </button>
                    ))}
                </div>
                <input type="hidden" name="paymentType" value={paymentType} />
            </div>

            {/* 청구 금액 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                <h3 className="font-bold text-slate-800">청구 금액</h3>
                {grandTotal !== null && !isFree && (
                    <p className="text-xs text-slate-500">견적서 합계: <strong>{grandTotal.toLocaleString()}원</strong>이 자동 입력되었습니다.</p>
                )}
                <div className="relative">
                    <input
                        type="number"
                        name="amount"
                        value={isFree ? 0 : amount}
                        onChange={(e) => setAmount(parseInt(e.target.value) || 0)}
                        disabled={isFree}
                        className="w-full p-3 pr-10 border border-slate-200 rounded-lg text-right text-lg font-mono font-bold disabled:bg-slate-50 disabled:text-slate-400"
                    />
                    <span className="absolute right-3 top-3.5 text-slate-400 text-sm">원</span>
                </div>
                {isAutoComplete && (
                    <p className="text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                        ✅ {paymentType === '현장카드결제' ? '현장카드결제' : '무상'} — 저장 시 즉시 <strong>완납</strong> 처리됩니다.
                    </p>
                )}
            </div>

            {/* 메모 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <label className="block text-sm font-medium text-slate-600 mb-2">메모 (선택)</label>
                <textarea name="memo" rows={2} placeholder="입금 예정일, 특이사항 등" defaultValue={existingExpense?.memo || ''}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 max-w-2xl mx-auto">
                <button type="submit" disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-3 px-6 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2">
                    <Save className="w-5 h-5" />
                    {isSubmitting ? '저장 중...' : '지출현황 저장 · 완료'}
                </button>
            </div>
        </form>
    );
}
