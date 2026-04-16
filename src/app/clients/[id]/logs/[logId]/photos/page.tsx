export const dynamic = 'force-dynamic';
import { prisma } from '@/lib/prisma';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Camera, CheckCircle, SkipForward } from 'lucide-react';
import { confirmPhotos, skipPhotos } from '@/app/actions';

export default async function PhotosPage({ params }: { params: { id: string; logId: string } }) {
    const customerId = parseInt(params.id);
    const logId = parseInt(params.logId);
    if (isNaN(customerId) || isNaN(logId)) return notFound();

    const log = await prisma.serviceLog.findUnique({
        where: { id: logId },
        include: { machine: { include: { customer: true } } },
    });
    if (!log) return notFound();

    return (
        <div className="max-w-2xl mx-auto p-4">
            <header className="mb-6 flex items-center gap-3">
                <Link href={`/clients/${customerId}/logs/${logId}/quote`} className="p-2 -ml-2 hover:bg-slate-100 rounded-full transition-colors">
                    <ArrowLeft className="w-6 h-6 text-slate-700" />
                </Link>
                <div>
                    <p className="text-xs text-slate-500 font-medium">Step 3 / 4 · {log.machine.customer.name} {log.machine.unitNo}호기</p>
                    <h1 className="text-xl font-bold text-slate-900">교체사진 확인</h1>
                </div>
            </header>

            <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 text-center space-y-6">
                <div className={`mx-auto w-20 h-20 rounded-full flex items-center justify-center ${log.photosConfirmed ? 'bg-green-100' : 'bg-slate-100'}`}>
                    {log.photosConfirmed
                        ? <CheckCircle className="w-10 h-10 text-green-500" />
                        : <Camera className="w-10 h-10 text-slate-400" />
                    }
                </div>

                <div>
                    <h2 className="text-lg font-bold text-slate-800 mb-1">
                        {log.photosConfirmed ? '사진 첨부 완료!' : '사내 공유폴더에 사진을 첨부했나요?'}
                    </h2>
                    <p className="text-sm text-slate-500">
                        교체 부품이 있으면 사내 공유폴더에 사진을 업로드한 후 아래 버튼을 눌러 확인해 주세요.
                    </p>
                </div>

                <form action={confirmPhotos}>
                    <input type="hidden" name="serviceLogId" value={logId} />
                    <input type="hidden" name="customerId" value={customerId} />
                    <input type="hidden" name="photosConfirmed" value="true" />
                    <button type="submit"
                        className="w-full bg-green-600 text-white py-3 px-6 rounded-xl font-bold hover:bg-green-700 active:scale-95 transition-all flex items-center justify-center gap-2">
                        <CheckCircle className="w-5 h-5" />
                        공유폴더 사진 첨부 완료 → 다음
                    </button>
                </form>

                <form action={skipPhotos}>
                    <input type="hidden" name="serviceLogId" value={logId} />
                    <input type="hidden" name="customerId" value={customerId} />
                    <button type="submit"
                        className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl border-2 border-slate-200 text-slate-500 font-medium hover:bg-slate-50 transition-all text-sm">
                        <SkipForward className="w-4 h-4" />
                        교체 없음 / 건너뛰기
                    </button>
                </form>
            </div>
        </div>
    );
}
