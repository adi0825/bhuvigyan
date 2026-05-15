import type { ReactNode } from 'react'

type Color = 'green' | 'red' | 'yellow' | 'blue' | 'gray'

const COLORS: Record<Color, string> = {
  green:  'bg-green-100 text-green-700 border-green-200',
  red:    'bg-red-100 text-red-700 border-red-200',
  yellow: 'bg-yellow-100 text-yellow-700 border-yellow-200',
  blue:   'bg-blue-100 text-blue-700 border-blue-200',
  gray:   'bg-gray-100 text-gray-600 border-gray-200'
}

export default function Badge({
  children,
  color = 'gray'
}: {
  children: ReactNode
  color?: Color
}) {
  return (
    <span className={`inline-flex items-center px-2.5
      py-0.5 rounded-full text-xs font-semibold
      border ${COLORS[color]}`}>
      {children}
    </span>
  )
}
