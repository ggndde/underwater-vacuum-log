'use client'

import { useState, Fragment } from 'react'
import { useRouter } from 'next/navigation'
import { X, Plus, Trash2 } from 'lucide-react'

type Contact = { name: string; phone: string }

export default function AddClientModal() {
    const router = useRouter()
    const [open, setOpen] = useState(false)
    const [loading, setLoading] = useState(false)
    const [name, setName] = useState('')
    const [address, setAddress] = useState('')
    const [remarks, setRemarks] = useState('')
    const [contacts, setContacts] = useState<Contact[]>([{ name: '', phone: '' }])

    const addContact = () => setContacts(prev => [...prev, { name: '', phone: '' }])
    const removeContact = (i: number) => setContacts(prev => prev.filter((_, idx) => idx !== i))
    const updateContact = (i: number, field: keyof Contact, value: string) =>
        setContacts(prev => prev.map((c, idx) => idx === i ? { ...c, [field]: value } : c))

    const handleClose = () => {
        setOpen(false)
        setName('')
        setAddress('')
        setRemarks('')
        setContacts([{ name: '', phone: '' }])
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!name.trim()) return

        setLoading(true)
        try {
            const validContacts = contacts.filter(c => c.name.trim() || c.phone.trim())
            const res = await fetch('/api/clients', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    name,
                    address,
                    remarks,
                    contacts: validContacts.length > 0 ? validContacts : null,
                }),
            })
            if (!res.ok) {
                const data = await res.json()
                alert(data.error || '오류가 발생했습니다.')
                return
            }
            handleClose()
            router.refresh()
        } catch {
            alert('네트워크 오류가 발생했습니다.')
        } finally {
            setLoading(false)
        }
    }

    return (
        <>
            {/* FAB 버튼 */}
            <button
                onClick={() => setOpen(true)}
                className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white rounded-full p-4 shadow-lg flex items-center gap-2 shadow-blue-900/20 active:scale-95 transition-all pr-5"
            >
                <Plus className="w-5 h-5" />
                <span className="text-base font-bold">거래처 추가</span>
            </button>

            {/* 모달 오버레이 */}
            {open && (
                <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
                    {/* 배경 */}
                    <div
                        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
                        onClick={handleClose}
                    />

                    {/* 모달 패널 */}
                    <div className="relative bg-white w-full sm:max-w-lg sm:rounded-2xl rounded-t-2xl shadow-2xl p-6 max-h-[90vh] overflow-y-auto">
                        <div className="flex justify-between items-center mb-5">
                            <h2 className="text-xl font-bold text-slate-800">거래처 추가</h2>
                            <button
                                onClick={handleClose}
                                className="text-slate-400 hover:text-slate-600 transition-colors"
                            >
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-4">
                            {/* 거래처명 */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    거래처명 <span className="text-red-500">*</span>
                                </label>
                                <input
                                    type="text"
                                    value={name}
                                    onChange={e => setName(e.target.value)}
                                    placeholder="예: 가나수영장"
                                    required
                                    className="w-full text-base border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                />
                            </div>

                            {/* 주소 */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    주소
                                </label>
                                <input
                                    type="text"
                                    value={address}
                                    onChange={e => setAddress(e.target.value)}
                                    placeholder="예: 서울시 강남구..."
                                    className="w-full text-base border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                />
                            </div>

                            {/* 담당자 */}
                            <div>
                                <div className="flex justify-between items-center mb-1.5">
                                    <label className="text-sm font-semibold text-slate-700">담당자</label>
                                    <button
                                        type="button"
                                        onClick={addContact}
                                        className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline"
                                    >
                                        <Plus className="w-3.5 h-3.5" /> 추가
                                    </button>
                                </div>
                                {/* 헤더 + 모든 입력 행을 하나의 grid 안에 — 열 너비를 한 번에 계산 */}
                                <div className="grid grid-cols-[1fr_1fr_1.5rem] gap-x-2 gap-y-2 items-center">
                                    {/* 헤더 행 (같은 grid의 직접 자식) */}
                                    <span className="text-xs font-medium text-slate-400 pl-3">이름</span>
                                    <span className="text-xs font-medium text-slate-400 pl-3">연락처</span>
                                    <span />
                                    {/* 입력 행들 (같은 grid의 직접 자식) */}
                                    {contacts.map((c, i) => (
                                        <Fragment key={i}>
                                            <input
                                                type="text"
                                                value={c.name}
                                                onChange={e => updateContact(i, 'name', e.target.value)}
                                                placeholder="홍길동"
                                                className="text-base border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            />
                                            <input
                                                type="text"
                                                value={c.phone}
                                                onChange={e => updateContact(i, 'phone', e.target.value)}
                                                placeholder="010-0000-0000"
                                                className="text-base border border-slate-300 rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none transition"
                                            />
                                            <div className="flex items-center justify-center">
                                                {contacts.length > 1 && (
                                                    <button
                                                        type="button"
                                                        onClick={() => removeContact(i)}
                                                        className="text-slate-400 hover:text-red-500 transition-colors"
                                                    >
                                                        <Trash2 className="w-4 h-4" />
                                                    </button>
                                                )}
                                            </div>
                                        </Fragment>
                                    ))}
                                </div>
                            </div>

                            {/* 비고 */}
                            <div>
                                <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                                    비고
                                </label>
                                <input
                                    type="text"
                                    value={remarks}
                                    onChange={e => setRemarks(e.target.value)}
                                    placeholder="예: Myrtha Pool System"
                                    className="w-full text-base border border-slate-300 rounded-lg px-3 py-2.5 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none transition"
                                />
                            </div>

                            {/* 버튼 */}
                            <div className="flex gap-3 pt-2">
                                <button
                                    type="button"
                                    onClick={handleClose}
                                    className="flex-1 py-3 rounded-xl border border-slate-300 text-slate-600 font-semibold text-base hover:bg-slate-50 transition"
                                >
                                    취소
                                </button>
                                <button
                                    type="submit"
                                    disabled={loading || !name.trim()}
                                    className="flex-1 py-3 rounded-xl bg-blue-600 text-white font-semibold text-base hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                                >
                                    {loading ? '저장 중...' : '거래처 등록'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </>
    )
}
