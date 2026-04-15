'use client';

import { useState } from 'react';
import { upsertMachine, deleteMachine } from '@/app/actions';
import { Save, Trash2 } from 'lucide-react';

type Machine = {
    id: number;
    modelName: string;
    serialNumber: string;
    productType: string;
    unitNo: number;
    poolSize: string | null;
    obstacles: string | null;
    floorType: string | null;
    purchaseDate: Date | null;
} | null;

const PRODUCT_TYPES = ['CP', 'PP', 'N3', 'OS'];

export default function MachineForm({ customerId, machine }: { customerId: number; machine: Machine }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isDeleting, setIsDeleting] = useState(false);
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        await upsertMachine(new FormData(e.currentTarget));
    };

    const handleDelete = async () => {
        setIsDeleting(true);
        const fd = new FormData();
        fd.set('machineId', String(machine!.id));
        fd.set('customerId', String(customerId));
        await deleteMachine(fd);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-5 pb-28">
            <input type="hidden" name="customerId" value={customerId} />
            {machine && <input type="hidden" name="machineId" value={machine.id} />}

            {/* 제품 유형 + 호기 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2">제품 정보</h3>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-2">제품 유형</label>
                    <div className="grid grid-cols-4 gap-2">
                        {PRODUCT_TYPES.map((type) => (
                            <label key={type} className="cursor-pointer">
                                <input type="radio" name="productType" value={type}
                                    defaultChecked={(machine?.productType || 'CP') === type}
                                    className="sr-only peer" required />
                                <div className="text-center py-2 rounded-lg border-2 border-slate-200 text-slate-600 font-bold text-sm peer-checked:border-blue-500 peer-checked:bg-blue-50 peer-checked:text-blue-700 transition-all cursor-pointer hover:border-slate-300">
                                    {type}
                                </div>
                            </label>
                        ))}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">호기 번호</label>
                        <div className="relative">
                            <input type="number" name="unitNo" min="1" max="10"
                                defaultValue={machine?.unitNo || 1}
                                className="w-full p-2 pr-10 border border-slate-200 rounded-lg text-sm font-bold text-center"
                                required />
                            <span className="absolute right-3 top-2.5 text-slate-400 text-sm">호기</span>
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">구매일 (선택)</label>
                        <input type="date" name="purchaseDate"
                            defaultValue={machine?.purchaseDate
                                ? new Date(machine.purchaseDate).toISOString().split('T')[0]
                                : ''}
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                </div>
            </div>

            {/* 모델 정보 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2">모델 정보</h3>
                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">모델명 *</label>
                        <input type="text" name="modelName" defaultValue={machine?.modelName || ''}
                            placeholder="예: CP 300" required
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">제품번호 *</label>
                        <input type="text" name="serialNumber" defaultValue={machine?.serialNumber || ''}
                            placeholder="시리얼 번호" required
                            className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                    </div>
                </div>
            </div>

            {/* 풀장 정보 */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 space-y-4">
                <h3 className="font-bold text-slate-800 border-b pb-2">풀장 정보</h3>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">풀장 크기</label>
                    <input type="text" name="poolSize" defaultValue={machine?.poolSize || ''}
                        placeholder="예: 25M x 13.5M (6 lanes)"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">장애물</label>
                    <input type="text" name="obstacles" defaultValue={machine?.obstacles || ''}
                        placeholder="예: 경사로 1개, 사다리 2개"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">바닥 재질</label>
                    <input type="text" name="floorType" defaultValue={machine?.floorType || ''}
                        placeholder="바닥 재질 정보"
                        className="w-full p-2 border border-slate-200 rounded-lg text-sm" />
                </div>
            </div>

            {/* 삭제 영역 */}
            {machine && (
                <div className="bg-red-50 border border-red-200 rounded-xl p-4">
                    {!showDeleteConfirm ? (
                        <button type="button" onClick={() => setShowDeleteConfirm(true)}
                            className="text-red-600 text-sm font-medium flex items-center gap-2 hover:underline">
                            <Trash2 className="w-4 h-4" /> 이 장비 삭제
                        </button>
                    ) : (
                        <div className="space-y-2">
                            <p className="text-sm text-red-700 font-bold">정말 삭제하시겠습니까? 관련 방문기록도 모두 삭제됩니다.</p>
                            <div className="flex gap-2">
                                <button type="button" onClick={handleDelete} disabled={isDeleting}
                                    className="bg-red-600 text-white px-4 py-2 rounded-lg text-sm font-bold hover:bg-red-700">
                                    {isDeleting ? '삭제 중...' : '확인 삭제'}
                                </button>
                                <button type="button" onClick={() => setShowDeleteConfirm(false)}
                                    className="px-4 py-2 rounded-lg text-sm border border-slate-300">
                                    취소
                                </button>
                            </div>
                        </div>
                    )}
                </div>
            )}

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 max-w-2xl mx-auto">
                <button type="submit" disabled={isSubmitting}
                    className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center gap-2">
                    <Save className="w-5 h-5" />
                    {isSubmitting ? '저장 중...' : '저장하기'}
                </button>
            </div>
        </form>
    );
}
