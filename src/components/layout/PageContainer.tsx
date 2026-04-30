import { ReactNode } from 'react'

interface PageContainerProps {
  children: ReactNode
  title?: string
  actions?: ReactNode
}

export default function PageContainer({ children, title, actions }: PageContainerProps) {
  return (
    <div className="p-6 max-w-7xl mx-auto w-full">
      {(title || actions) && (
        <div className="flex items-center justify-between mb-6">
          {title && <h1 className="text-xl font-semibold text-gray-900">{title}</h1>}
          {actions && <div className="flex items-center gap-3">{actions}</div>}
        </div>
      )}
      {children}
    </div>
  )
}
