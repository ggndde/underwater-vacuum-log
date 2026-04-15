import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] text-center">
      <h2 className="text-3xl font-bold mb-4">404 - 페이지를 찾을 수 없습니다</h2>
      <p className="text-slate-500 mb-8">요청하신 페이지가 존재하지 않거나 삭제되었습니다.</p>
      <Link href="/" className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors">
        홈으로 돌아가기
      </Link>
    </div>
  )
}
