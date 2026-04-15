'use client'

import { useState } from 'react'
import { FileUp } from 'lucide-react'
import { PdfImportModal } from './PdfImportModal'

export function PdfImportButton() {
    const [open, setOpen] = useState(false)

    function handleImported() {
        // Reload the page so the new parts appear (server component)
        window.location.reload()
    }

    return (
        <>
            <button
                onClick={() => setOpen(true)}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 hover:border-blue-300 transition-colors shadow-sm"
            >
                <FileUp className="w-4 h-4 text-blue-500" />
                PDF로 가져오기
            </button>

            {open && (
                <PdfImportModal
                    onClose={() => setOpen(false)}
                    onImported={handleImported}
                />
            )}
        </>
    )
}
