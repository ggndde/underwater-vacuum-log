'use client';

import { useState } from 'react';
import { createServiceLog } from '@/app/actions';
import { ArrowLeft, Plus, Trash2, Save, CreditCard, Gift } from 'lucide-react';
import Link from 'next/link';

type Machine = {
    id: number;
    modelName: string;
    serialNumber: string;
    productType: string;
    unitNo: number;
};

export default function LogForm({ customerId, machines }: { customerId: number; machines: Machine[] }) {
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [settingsChanges, setSettingsChanges] = useState<{ param: string; old: string; new: string }[]>([]);
    const [visitType, setVisitType] = useState<'유상' | '무상'>('유상');

    const addSettingChange = () => {
        setSettingsChanges([...settingsChanges, { param: '', old: '', new: '' }]);
    };

    const removeSettingChange = (index: number) => {
        setSettingsChanges(settingsChanges.filter((_, i) => i !== index));
    };

    const updateSettingChange = (index: number, field: 'param' | 'old' | 'new', value: string) => {
        const newChanges = [...settingsChanges];
        newChanges[index][field] = value;
        setSettingsChanges(newChanges);
    };

    const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSubmitting(true);
        const formData = new FormData(e.currentTarget);

        if (settingsChanges.length > 0) {
            formData.set('settingsChanges', JSON.stringify(settingsChanges));
        }

        await createServiceLog(formData);
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6 pb-20">
            <input type="hidden" name="customerId" value={customerId} />

            {/* 방문 유형 (유상/무상) */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-4">방문 구분</h3>
                <div className="grid grid-cols-2 gap-3">
                    <button
                        type="button"
                        onClick={() => setVisitType('유상')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-bold transition-all ${visitType === '유상'
                                ? 'border-blue-500 bg-blue-50 text-blue-700'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                    >
                        <CreditCard className="w-5 h-5" />
                        유상 방문
                    </button>
                    <button
                        type="button"
                        onClick={() => setVisitType('무상')}
                        className={`flex items-center justify-center gap-2 py-3 px-4 rounded-xl border-2 font-bold transition-all ${visitType === '무상'
                                ? 'border-green-500 bg-green-50 text-green-700'
                                : 'border-slate-200 text-slate-500 hover:border-slate-300'
                            }`}
                    >
                        <Gift className="w-5 h-5" />
                        무상 방문
                    </button>
                </div>
                <input type="hidden" name="visitType" value={visitType} />
                {visitType === '무상' && (
                    <p className="mt-3 text-sm text-green-700 bg-green-50 rounded-lg px-3 py-2">
                        ℹ️ 무상 방문은 견적서·사진·지출현황 작성이 생략됩니다.
                    </p>
                )}
            </div>

            {/* 호기 선택 (머신이 2개 이상일 때만 표시) */}
            {machines.length > 1 && (
                <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-lg text-slate-800 border-b pb-2 mb-3">대상 장비 선택</h3>
                    <div className="grid gap-2">
                        {machines.map((m) => (
                            <label key={m.id} className="flex items-center gap-3 p-3 border border-slate-200 rounded-lg cursor-pointer hover:bg-slate-50">
                                <input type="radio" name="machineId" value={m.id} defaultChecked={machines[0].id === m.id} required className="w-4 h-4 accent-blue-600" />
                                <span className="font-medium text-slate-800">
                                    {m.unitNo}호기 <span className="text-slate-400 text-sm">({m.productType})</span>
                                </span>
                                <span className="text-xs text-slate-500 ml-auto">{m.modelName} · {m.serialNumber}</span>
                            </label>
                        ))}
                    </div>
                </div>
            )}
            {machines.length === 1 && (
                <input type="hidden" name="machineId" value={machines[0].id} />
            )}

            {/* Header / Basic Info */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-lg text-slate-800 border-b pb-2">기본 정보</h3>

                <div className="grid grid-cols-2 gap-4">
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">방문/작업 유형</label>
                        <select name="type" className="w-full p-2 border border-slate-300 rounded-lg text-sm" defaultValue="VISIT">
                            <option value="VISIT">현장 방문</option>
                            <option value="CALL">유선 상담</option>
                            <option value="DELIVERY">택배 발송</option>
                            <option value="ETC">기타</option>
                        </select>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-slate-600 mb-1">담당자</label>
                        <input type="text" name="technician" className="w-full p-2 border border-slate-300 rounded-lg text-sm" defaultValue="구길재" />
                    </div>
                </div>

                <div>
                    <label className="block text-sm font-medium text-slate-600 mb-1">조치 구분 (선택)</label>
                    <input type="text" name="actionType" placeholder="예: 부품 교체, 이물 제거" className="w-full p-2 border border-slate-300 rounded-lg text-sm" />
                </div>
            </div>

            {/* Machine Status */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-lg text-slate-800 border-b pb-2">장비 상태 확인</h3>
                <div className="grid grid-cols-3 gap-3">
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">HOURS</label>
                        <input type="number" step="0.01" name="hours" placeholder="0.00" className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">CYCLES</label>
                        <input type="number" name="cycles" placeholder="0" className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono" />
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-slate-500 mb-1">ERROR</label>
                        <input type="text" name="errorCodes" placeholder="코드" className="w-full p-2 border border-slate-300 rounded-lg text-sm font-mono" />
                    </div>
                </div>
            </div>

            {/* Work Details */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-lg text-slate-800 border-b pb-2">작업 및 상담 내용</h3>
                <textarea
                    name="body"
                    rows={5}
                    className="w-full p-3 border border-slate-300 rounded-lg text-sm leading-relaxed"
                    placeholder="상세한 작업 내용이나 상담 내역을 입력하세요."
                ></textarea>
            </div>

            {/* Settings */}
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-4">
                <h3 className="font-bold text-lg text-slate-800 border-b pb-2">세팅 값 변경</h3>

                <div className="grid grid-cols-4 gap-2 text-center text-xs font-bold text-slate-500 mb-2">
                    <div>전(Front)</div>
                    <div>후(Rear)</div>
                    <div>폭(Width)</div>
                    <div>P(Prog)</div>
                </div>
                <div className="grid grid-cols-4 gap-2 mb-4">
                    <input type="text" name="settingFront" placeholder="-" className="w-full p-2 border border-slate-300 rounded-lg text-center text-sm" />
                    <input type="text" name="settingRear" placeholder="-" className="w-full p-2 border border-slate-300 rounded-lg text-center text-sm" />
                    <input type="text" name="settingWidth" placeholder="-" className="w-full p-2 border border-slate-300 rounded-lg text-center text-sm" />
                    <input type="text" name="settingP" placeholder="-" className="w-full p-2 border border-slate-300 rounded-lg text-center text-sm" />
                </div>

                <div className="space-y-3">
                    <div className="flex justify-between items-center">
                        <span className="text-sm font-bold text-slate-600">세부 변경 내역</span>
                        <button type="button" onClick={addSettingChange} className="text-blue-600 text-xs font-bold flex items-center hover:bg-blue-50 px-2 py-1 rounded">
                            <Plus className="w-3 h-3 mr-1" /> 항목 추가
                        </button>
                    </div>

                    {settingsChanges.map((change, index) => (
                        <div key={index} className="flex gap-2 items-start bg-slate-50 p-2 rounded-lg">
                            <div className="flex-1 space-y-2">
                                <input
                                    type="text"
                                    placeholder="항목명 (예: MAX TIME)"
                                    className="w-full p-1.5 border border-slate-300 rounded text-xs"
                                    value={change.param}
                                    onChange={(e) => updateSettingChange(index, 'param', e.target.value)}
                                />
                                <div className="flex gap-2 items-center">
                                    <input
                                        type="text"
                                        placeholder="변경 전"
                                        className="flex-1 p-1.5 border border-slate-300 rounded text-xs"
                                        value={change.old}
                                        onChange={(e) => updateSettingChange(index, 'old', e.target.value)}
                                    />
                                    <span className="text-slate-400">→</span>
                                    <input
                                        type="text"
                                        placeholder="변경 후"
                                        className="flex-1 p-1.5 border border-slate-300 rounded text-xs font-bold text-blue-600"
                                        value={change.new}
                                        onChange={(e) => updateSettingChange(index, 'new', e.target.value)}
                                    />
                                </div>
                            </div>
                            <button
                                type="button"
                                onClick={() => removeSettingChange(index)}
                                className="text-slate-400 hover:text-red-500 p-1"
                            >
                                <Trash2 className="w-4 h-4" />
                            </button>
                        </div>
                    ))}
                </div>
            </div>

            <div className="fixed bottom-0 left-0 right-0 p-4 bg-white border-t border-slate-200 flex justify-end max-w-4xl mx-auto">
                <button
                    type="submit"
                    disabled={isSubmitting}
                    className="bg-blue-600 text-white w-full md:w-auto px-6 py-3 rounded-xl font-bold text-lg shadow-lg hover:bg-blue-700 active:scale-95 transition-all flex justify-center items-center"
                >
                    <Save className="w-5 h-5 mr-2" />
                    {isSubmitting ? '저장 중...' : '기록 저장하기'}
                </button>
            </div>
        </form>
    );
}
