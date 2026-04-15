export const dynamic = 'force-dynamic';
import { PrismaClient } from '@prisma/client';
import Link from 'next/link';
import { ArrowLeft, FileText, PenSquare, Plus } from 'lucide-react';
import { notFound } from 'next/navigation';
import ExpenseStatusForm from './ExpenseStatusForm';
import DeleteClientButton from './DeleteClientButton';

const prisma = new PrismaClient();

type LogEntry = {
    id: number;
    date: Date;
    type: string;
    visitType: string;
    technician: string | null;
    body: string | null;
    actionType: string | null;
    hours: number | null;
    cycles: number | null;
    errorCodes: string | null;
    settingFront: string | null;
    settingRear: string | null;
    settingWidth: string | null;
    settingP: string | null;
    settingsChanges: string | null;
    photosConfirmed: boolean;
    machine: { id: number; unitNo: number; productType: string };
    quote: { id: number; quoteNo: string } | null;
    expense: { id: number; amount: number; status: string } | null;
};

const formatDate = (date: Date) =>
    new Intl.DateTimeFormat('ko-KR', { year: '2-digit', month: '2-digit', day: '2-digit' })
        .format(date).replace(/\./g, '.').slice(0, -1);

export default async function ClientDetail({ params }: { params: { id: string } }) {
    const id = parseInt(params.id);
    if (isNaN(id)) return notFound();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const customer = await (prisma as any).customer.findUnique({
        where: { id },
        include: {
            machines: {
                include: {
                    logs: {
                        orderBy: { date: 'desc' },
                        include: { quote: true, expense: true }
                    }
                },
                orderBy: { unitNo: 'asc' }
            }
        }
    }) as {
        id: number;
        name: string;
        address: string | null;
        contacts: string | null;
        machines: Array<{
            id: number;
            modelName: string;
            serialNumber: string;
            productType: string;
            unitNo: number;
            logs: Array<Omit<LogEntry, 'machine'> & { machineId: number }>;
        }>;
    } | null;

    if (!customer) return notFound();

    const allLogs: LogEntry[] = customer.machines
        .flatMap((m) => m.logs.map((log) => ({ ...log, machine: { id: m.id, unitNo: m.unitNo, productType: m.productType } })))
        .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    return (
        <div className="max-w-4xl mx-auto p-4 pb-20">
            <div className="flex justify-between items-center mb-4">
                <Link href="/clients" className="inline-flex items-center text-slate-500 hover:text-blue-600 transition-colors">
                    <ArrowLeft className="w-4 h-4 mr-1" /> 목록으로
                </Link>
                <DeleteClientButton customerId={id} customerName={customer.name} />
            </div>

            {/* 고객 정보 */}
            <div className="bg-white border-2 border-slate-800 p-4 mb-6 shadow-sm">
                <h1 className="text-xl font-bold border-b-2 border-slate-800 pb-2 mb-4 text-center bg-slate-50">
                    고객명 : {customer.name}
                </h1>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div className="space-y-2">
                        <div className="flex">
                            <span className="font-bold w-16 shrink-0">주 소</span>
                            <span>{customer.address}</span>
                        </div>
                        <div className="flex">
                            <span className="font-bold w-16 shrink-0">담 당</span>
                            <div className="flex-1">
                                <div className="whitespace-pre-wrap text-xs text-slate-600">
                                    {customer.contacts
                                        ? JSON.parse(customer.contacts).map((c: { name: string; phone: string }, i: number) => (
                                            <div key={i}>{c.name} ({c.phone})</div>
                                        ))
                                        : '-'}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* 장비 목록 */}
                    <div className="space-y-2 border-t md:border-t-0 md:border-l border-slate-200 md:pl-4 pt-4 md:pt-0">
                        <div className="flex justify-between items-center mb-2">
                            <span className="text-xs font-bold text-slate-500 uppercase">보유 장비</span>
                            <Link href={`/clients/${id}/machines/new`}
                                className="text-xs text-blue-600 font-medium flex items-center gap-1 hover:underline">
                                <Plus className="w-3 h-3" /> 장비 추가
                            </Link>
                        </div>
                        {customer.machines.map((m) => (
                            <div key={m.id} className="flex items-center justify-between text-sm text-slate-700">
                                <div className="flex items-center gap-2">
                                    <span className="w-2 h-2 bg-green-500 rounded-full" />
                                    <span className="font-medium">{m.unitNo}호기</span>
                                    <span className="text-xs bg-slate-100 px-1.5 py-0.5 rounded font-mono">{m.productType}</span>
                                    <span className="text-slate-400 text-xs">{m.modelName} · {m.serialNumber}</span>
                                </div>
                                <Link href={`/clients/${id}/machines/${m.id}`}
                                    className="text-xs text-slate-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                                    <PenSquare className="w-3 h-3" /> 편집
                                </Link>
                            </div>
                        ))}
                        {customer.machines.length === 0 && (
                            <p className="text-xs text-slate-400 text-center py-2">등록된 장비가 없습니다.</p>
                        )}
                    </div>
                </div>
            </div>

            {/* 서비스 기록 */}
            <div className="mb-4 flex justify-between items-center">
                <h2 className="font-bold text-lg flex items-center">
                    <FileText className="w-5 h-5 mr-2 text-blue-600" />
                    서비스 및 상담 내역
                </h2>
                <Link href={`/clients/${id}/log/new`}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-bold shadow-md hover:bg-blue-700 active:scale-95 transition-all flex items-center">
                    + 방문/기록 작성
                </Link>
            </div>

            <div className="bg-white border border-slate-300 shadow-sm overflow-hidden rounded-lg">
                <div className="hidden md:grid grid-cols-[80px_1fr_180px_80px] bg-slate-100 border-b border-slate-300 font-bold text-sm text-center py-2">
                    <div>일 자</div>
                    <div>서비스 및 상담 내역</div>
                    <div>SETTING (전/후/폭/P)</div>
                    <div>담당</div>
                </div>

                <div className="divide-y divide-slate-200">
                    {allLogs.map((log) => {
                        const isVisit = log.type === 'VISIT';
                        const isPaid = log.visitType === '유상';
                        const hasQuote = !!log.quote;
                        const hasPhotos = log.photosConfirmed;
                        const hasExpense = !!log.expense;
                        const expenseStatus = log.expense?.status;

                        return (
                            <div key={log.id} className="md:grid md:grid-cols-[80px_1fr_180px_80px] text-sm group hover:bg-slate-50 transition-colors">
                                {/* 날짜 */}
                                <div className="p-3 font-medium text-slate-600 md:text-center whitespace-nowrap bg-slate-50 md:bg-transparent flex justify-between md:block items-center">
                                    <span className="md:hidden font-bold">DATE: </span>
                                    {formatDate(log.date)}
                                </div>

                                {/* 내용 */}
                                <div className="p-3 border-l-4 border-l-transparent md:border-l-0">
                                    <div className="flex flex-wrap gap-1 mb-1">
                                        <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${log.type === 'VISIT' ? 'bg-red-50 text-red-600 border-red-200' : log.type === 'CALL' ? 'bg-yellow-50 text-yellow-700 border-yellow-200' : 'bg-blue-50 text-blue-600 border-blue-200'}`}>
                                            {log.type === 'VISIT' ? '● 현장' : log.type === 'CALL' ? '☎ 전화' : '＠ 기타'}
                                        </span>
                                        {isVisit && (
                                            <span className={`text-xs font-bold px-1.5 py-0.5 rounded border ${isPaid ? 'bg-orange-50 text-orange-600 border-orange-200' : 'bg-green-50 text-green-600 border-green-200'}`}>
                                                {isPaid ? '유상' : '무상'}
                                            </span>
                                        )}
                                        {log.actionType && <span className="ml-1 text-xs text-slate-500">[{log.actionType}]</span>}
                                    </div>

                                    {/* 숙제 뱃지 */}
                                    {isVisit && isPaid && (
                                        <div className="flex flex-wrap gap-1 my-2">
                                            {hasQuote ? (
                                                <Link href={`/clients/${id}/logs/${log.id}/quote`}
                                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                                                    ✅ {log.quote!.quoteNo}
                                                </Link>
                                            ) : (
                                                <Link href={`/clients/${id}/logs/${log.id}/quote`}
                                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                                    📋 견적서 작성
                                                </Link>
                                            )}
                                            {hasPhotos ? (
                                                <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-green-100 text-green-700">
                                                    📸 사진 확인완료
                                                </span>
                                            ) : (
                                                <Link href={`/clients/${id}/logs/${log.id}/photos`}
                                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                                    📸 사진 확인
                                                </Link>
                                            )}
                                            {hasExpense ? (
                                                <span className={`inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full ${expenseStatus === '완납' ? 'bg-green-100 text-green-700' : expenseStatus === '청구' ? 'bg-yellow-100 text-yellow-700' : 'bg-red-100 text-red-600'}`}>
                                                    💰 {log.expense!.amount.toLocaleString()}원 · {expenseStatus}
                                                </span>
                                            ) : (
                                                <Link href={`/clients/${id}/logs/${log.id}/expense`}
                                                    className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full bg-slate-100 text-slate-500 hover:bg-orange-50 hover:text-orange-600 transition-colors">
                                                    💰 지출현황 작성
                                                </Link>
                                            )}
                                            {hasExpense && expenseStatus === '미수' && (
                                                <ExpenseStatusForm expenseId={log.expense!.id} customerId={id} nextStatus="청구" />
                                            )}
                                            {hasExpense && expenseStatus === '청구' && (
                                                <ExpenseStatusForm expenseId={log.expense!.id} customerId={id} nextStatus="완납" />
                                            )}
                                        </div>
                                    )}

                                    {customer.machines.length > 1 && (
                                        <div className="text-xs text-slate-400 mb-1">
                                            {log.machine.unitNo}호기 ({log.machine.productType})
                                        </div>
                                    )}

                                    {(log.hours || log.cycles || log.errorCodes) && (
                                        <div className="bg-slate-100 p-2 rounded mb-2 text-slate-700 text-xs font-mono space-y-1">
                                            {log.hours && <div>[Hours] : <span className="font-bold">{log.hours}</span></div>}
                                            {log.cycles && <div>[Cycles]: <span className="font-bold">{log.cycles}</span></div>}
                                            {log.errorCodes && <div className="text-red-600"><span className="font-bold">[Error] : </span>{log.errorCodes}</div>}
                                        </div>
                                    )}
                                    <div className="whitespace-pre-wrap leading-relaxed text-slate-800">{log.body}</div>
                                </div>

                                {/* 세팅 */}
                                <div className="p-3 md:text-center border-t md:border-t-0 md:border-l border-slate-100 flex md:block flex-col justify-center bg-slate-50 md:bg-transparent text-xs">
                                    <div className="flex md:block items-center justify-between w-full mb-2 md:mb-0">
                                        <span className="md:hidden font-bold text-slate-500 mr-2">SETTING:</span>
                                        <div className="grid grid-cols-4 gap-1 w-full md:w-auto text-center font-mono">
                                            <div className="bg-white md:bg-transparent border md:border-0 rounded px-1">{log.settingFront || '-'}</div>
                                            <div className="bg-white md:bg-transparent border md:border-0 rounded px-1">{log.settingRear || '-'}</div>
                                            <div className="bg-white md:bg-transparent border md:border-0 rounded px-1">{log.settingWidth || '-'}</div>
                                            <div className="bg-white md:bg-transparent border md:border-0 rounded px-1">{log.settingP || '-'}</div>
                                        </div>
                                    </div>
                                    {log.settingsChanges && (() => {
                                        try {
                                            const changes: { param: string; old: string; new: string }[] = JSON.parse(log.settingsChanges);
                                            if (Array.isArray(changes) && changes.length > 0) {
                                                return (
                                                    <div className="mt-2 space-y-1 border-t border-slate-200 pt-1">
                                                        {changes.map((ch, idx) => (
                                                            <div key={idx} className="flex justify-between items-center text-[10px] text-slate-500">
                                                                <span className="truncate mr-1 max-w-[80px]">{ch.param}</span>
                                                                <span className="font-mono">{ch.old} <span className="text-slate-300">→</span> <span className="text-blue-600 font-bold">{ch.new}</span></span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                        } catch { return null; }
                                        return null;
                                    })()}
                                </div>

                                {/* 담당 */}
                                <div className="p-3 md:text-center border-t md:border-t-0 md:border-l border-slate-100 text-slate-500 text-xs flex justify-end md:justify-center items-center">
                                    <span className="md:hidden mr-2">담당: </span>
                                    {log.technician}
                                </div>
                            </div>
                        );
                    })}

                    {allLogs.length === 0 && (
                        <div className="p-10 text-center text-slate-400">기록이 없습니다.</div>
                    )}
                </div>
            </div>
        </div>
    );
}
