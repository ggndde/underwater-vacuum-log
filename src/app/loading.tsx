import { Loader2 } from 'lucide-react'

export default function Loading() {
    return (
        <div className="fixed inset-0 min-h-screen bg-slate-50/50 dark:bg-slate-950/50 backdrop-blur-sm flex items-center justify-center z-[100] transition-all">
            <div className="flex flex-col items-center gap-3 p-6 bg-white dark:bg-slate-900 rounded-2xl shadow-xl border border-slate-100 dark:border-slate-800">
                <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400 animate-pulse">
                    페이지를 불러오는 중입니다...
                </p>
            </div>
        </div>
    )
}
