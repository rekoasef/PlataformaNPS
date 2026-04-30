import Link from 'next/link'
import { cn } from '@/lib/utils/cn'

interface PaginationProps {
  currentPage: number
  totalPages: number
  totalItems: number
  pageSize: number
  getPageUrl: (page: number) => string
}

function getPageRange(current: number, total: number): (number | null)[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)

  const pages: (number | null)[] = [1]
  if (current > 3) pages.push(null)
  for (let i = Math.max(2, current - 1); i <= Math.min(total - 1, current + 1); i++) {
    pages.push(i)
  }
  if (current < total - 2) pages.push(null)
  pages.push(total)
  return pages
}

export default function Pagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  getPageUrl,
}: PaginationProps) {
  if (totalPages <= 1) return null

  const from = (currentPage - 1) * pageSize + 1
  const to = Math.min(currentPage * pageSize, totalItems)
  const pages = getPageRange(currentPage, totalPages)

  const linkBase =
    'inline-flex items-center justify-center h-8 min-w-8 px-2 rounded text-sm font-medium transition-colors'

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-gray-200">
      <p className="text-sm text-gray-500">
        Mostrando <span className="font-medium text-gray-700">{from}–{to}</span> de{' '}
        <span className="font-medium text-gray-700">{totalItems}</span> clientes
      </p>

      <div className="flex items-center gap-1">
        {currentPage > 1 ? (
          <Link
            href={getPageUrl(currentPage - 1)}
            className={cn(linkBase, 'text-gray-600 hover:bg-gray-100')}
          >
            ← Anterior
          </Link>
        ) : (
          <span className={cn(linkBase, 'text-gray-300 cursor-not-allowed')}>← Anterior</span>
        )}

        {pages.map((page, idx) =>
          page === null ? (
            <span key={`ellipsis-${idx}`} className="px-1 text-gray-400 text-sm">
              …
            </span>
          ) : (
            <Link
              key={page}
              href={getPageUrl(page)}
              className={cn(
                linkBase,
                page === currentPage
                  ? 'bg-brand text-white'
                  : 'text-gray-600 hover:bg-gray-100'
              )}
            >
              {page}
            </Link>
          )
        )}

        {currentPage < totalPages ? (
          <Link
            href={getPageUrl(currentPage + 1)}
            className={cn(linkBase, 'text-gray-600 hover:bg-gray-100')}
          >
            Siguiente →
          </Link>
        ) : (
          <span className={cn(linkBase, 'text-gray-300 cursor-not-allowed')}>Siguiente →</span>
        )}
      </div>
    </div>
  )
}
