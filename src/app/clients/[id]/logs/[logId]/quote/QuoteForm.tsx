'use client';

import { useState } from 'react';
import { createQuote, skipQuote } from '@/app/actions';
import { Plus, Trash2, Save, SkipForward } from 'lucide-react';

type QuoteItem = { name: string; qty: number; unitPrice: number; amount: number };

type ExistingQuote = {
    id: number;
    quoteNo: string;
    items: string;
    totalAmount: number;
    taxAmount: number;
    grandTotal: number;
    memo: string | null;
} | null;

export default function QuoteForm({
    customerId,
    serviceLogId,
    machineId,
    existingQuote,
}: {
    customerId: number;
    serviceLogId: number;
    machineId: number;
    existingQuote: ExistingQuote;
}) {
    const initItems: QuoteItem[] = existingQuote
        ? JSON.parse(existingQuote.items)
        : [{ name: '', qty: 1, unitPrice: 0, amount: 0 }];

    const [items, setItems] = useState<QuoteItem[]>(initItems);
    const [includeTax, setIncludeTax] = useState(true);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSkipping, setIsSkipping] = useState(false);

    const totalAmount = items.reduce((s, i) => s + i.amount, 0);
    const taxAmount = includeTax ? Math.round(totalAmount * 0.1) : 0;
    const grandTotal = totalAmount + taxAmount;

    const updateItem = (idx: number, field: keyof QuoteItem, raw: string) => {
        const updated = [...items];
        if (field === 'name') {
            updated[idx].name = raw;
        } else {
            const val = parseFloat(raw) || 0;
            (updated[idx] as Record<string, number | string>)[field] = val;
            updated[idx].amount = updated[idx].qty * updated[idx].unitPrice;
        }
        setItems(updated);
    };

    const addItem = () => setItems([...items, { name: '', qty: 1, unitPrice: 0, amount: 0 }]);
    const removeItem = (idx: number) => setItems(items.filter((_, i) => i !== idx));

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);
        formData.set('items', JSON.stringify(items));
        await createQuote(formData);
    };

    const handleSkip = async () => {
        setIsSkipping(true);
        const fd = new FormData();
        fd.set('customerId', String(customerId));
        fd.set('serviceLogId', String(serviceLogId));
        await skipQuote(fd);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pb-28">
            <input type="hidden" name="serviceLogId" value={serviceLogId} />
            <input type="hidden" name="customerId" value={customerId} />
            <input type="hidden" name="machineId" value={machineId} />

            {existingQuote && (
                <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 text-sm text-amber-800">
                    이미 견적서 <strong>{existingQuote.quoteNo}</strong>가 작성되어 있습니다. 수정하거나 다음 단계로 이동하세요.
                </div>
            )}

            {/* 품목 목록 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden">
                <div className="p-4 border-b border-slate-100">
                    <h3 className="font-bold text-slate-800">견적 품목</h3>
                </div>

                {/* 헤더 */}
                <div className="hidden md:grid grid-cols-[1fr_70px_100px_100px_36px] gap-2 px-4 py-2 bg-slate-50 text-xs font-bold text-slate-500 uppercase">
                    <div>품목명</div><div className="text-center">수량</div>
                    <div className="text-right">단가 (원)</div>
                    <div className="text-right">금액 (원)</div>
                    <div />
                </div>

                <div className="divide-y divide-slate-100">
                    {items.map((item, idx) => (
                        <div key={idx} className="grid md:grid-cols-[1fr_70px_100px_100px_36px] gap-2 p-3 items-center">
                            <input
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm"
                                placeholder="품목명"
                                value={item.name}
                                onChange={(e) => updateItem(idx, 'name', e.target.value)}
                                required
                            />
                            <input
                                type="number" min="1"
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm text-center"
                                value={item.qty}
                                onChange={(e) => updateItem(idx, 'qty', e.target.value)}
                            />
                            <input
                                type="number" min="0"
                                className="w-full p-2 border border-slate-200 rounded-lg text-sm text-right"
                                value={item.unitPrice}
                                onChange={(e) => updateItem(idx, 'unitPrice', e.target.value)}
                            />
                            <div className="text-right text-sm font-medium text-slate-700 p-2">
                                {item.amount.toLocaleString()}
                            </div>
                            <button type="button" onClick={() => removeItem(idx)} disabled={items.length === 1}
                                className="text-slate-300 hover:text-red-500 disabled:opacity-20 transition-colors">
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>

                <div className="p-3 border-t border-slate-100">
                    <button type="button" onClick={addItem}
                        className="text-blue-600 text-sm font-medium flex items-center gap-1 hover:bg-blue-50 px-3 py-1.5 rounded-lg">
                        <Plus className="w-4 h-4" /> 품목 추가
                    </button>
                </div>
            </div>

            {/* 부가세 + 합계 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                    <input type="checkbox" checked={includeTax} onChange={(e) => setIncludeTax(e.target.checked)}
                        className="w-4 h-4 accent-blue-600" />
                    <span className="text-sm font-medium text-slate-700">부가세 (10%) 포함</span>
                </label>

                <div className="border-t border-slate-100 pt-3 space-y-1.5 text-sm">
                    <div className="flex justify-between text-slate-600">
                        <span>공급가액</span>
                        <span className="font-mono">{totalAmount.toLocaleString()} 원</span>
                    </div>
                    {includeTax && (
                        <div className="flex justify-between text-slate-500">
                            <span>부가세</span>
                            <span className="font-mono">{taxAmount.toLocaleString()} 원</span>
                        </div>
                    )}
                    <div className="flex justify-between font-bold text-lg text-slate-900 border-t pt-2 mt-2">
                        <span>합계</span>
                        <span className="font-mono text-blue-700">{grandTotal.toLocaleString()} 원</span>
                    </div>
                </div>
            </div>

            {/* 메모 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4">
                <label className="block text-sm font-medium text-slate-600 mb-2">메모 (선택)</label>
                <textarea name="memo" rows={2} placeholder="특이사항 등" defaultValue={existingQuote?.memo || ''}
                    className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
            </div>

            {/* 하단 버튼 */}
            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex justify-between max-w-4xl mx-auto gap-3">
                <button type="button" onClick={handleSkip} disabled={isSkipping}
                    className="flex items-center gap-2 px-4 py-3 rounded-xl border-2 border-slate-200 text-slate-500 font-medium hover:bg-slate-50 transition-all">
                    <SkipForward className="w-4 h-4" />
                    {isSkipping ? '이동 중...' : '건너뛰기'}
                </button>
                <button type="submit" disabled={isSubmitting}
                    className="flex-1 bg-blue-600 text-white px-6 py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2">
                    <Save className="w-5 h-5" />
                    {isSubmitting ? '저장 중...' : '견적서 저장 → 다음'}
                </button>
            </div>
        </form>
    );
}
