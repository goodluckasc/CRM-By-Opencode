import { useEffect, useRef, useState } from 'react'

const gradients = {
  blue: 'from-blue-500 to-blue-600',
  green: 'from-emerald-500 to-green-600',
  red: 'from-red-500 to-rose-600',
  yellow: 'from-amber-500 to-yellow-600',
  purple: 'from-purple-500 to-violet-600',
  orange: 'from-orange-500 to-amber-600',
  teal: 'from-teal-500 to-cyan-600',
  indigo: 'from-indigo-500 to-blue-600',
}

const iconBg = {
  blue: 'bg-blue-50 dark:bg-blue-900/40',
  green: 'bg-emerald-50 dark:bg-emerald-900/40',
  red: 'bg-red-50 dark:bg-red-900/40',
  yellow: 'bg-amber-50 dark:bg-amber-900/40',
  purple: 'bg-purple-50 dark:bg-purple-900/40',
  orange: 'bg-orange-50 dark:bg-orange-900/40',
  teal: 'bg-teal-50 dark:bg-teal-900/40',
  indigo: 'bg-indigo-50 dark:bg-indigo-900/40',
}

const iconColors = {
  blue: 'text-blue-600 dark:text-blue-400',
  green: 'text-emerald-600 dark:text-emerald-400',
  red: 'text-red-600 dark:text-red-400',
  yellow: 'text-amber-600 dark:text-amber-400',
  purple: 'text-purple-600 dark:text-purple-400',
  orange: 'text-orange-600 dark:text-orange-400',
  teal: 'text-teal-600 dark:text-teal-400',
  indigo: 'text-indigo-600 dark:text-indigo-400',
}

const accentBorders = {
  blue: 'border-l-blue-500',
  green: 'border-l-emerald-500',
  red: 'border-l-red-500',
  yellow: 'border-l-amber-500',
  purple: 'border-l-purple-500',
  orange: 'border-l-orange-500',
  teal: 'border-l-teal-500',
  indigo: 'border-l-indigo-500',
}

const hoverShadows = {
  blue: 'hover:shadow-blue-500/10',
  green: 'hover:shadow-emerald-500/10',
  red: 'hover:shadow-red-500/10',
  yellow: 'hover:shadow-amber-500/10',
  purple: 'hover:shadow-purple-500/10',
  orange: 'hover:shadow-orange-500/10',
  teal: 'hover:shadow-teal-500/10',
  indigo: 'hover:shadow-indigo-500/10',
}

export default function SummaryCard({ title, value, icon: Icon, color = 'blue', subtitle, trend, prefix = '' }) {
  const [displayValue, setDisplayValue] = useState(0)
  const ref = useRef(null)
  const hasAnimated = useRef(false)

  useEffect(() => {
    const el = ref.current
    if (!el || hasAnimated.current) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated.current) {
          hasAnimated.current = true
          const target = Number(value) || 0
          const duration = 800
          const steps = 30
          const increment = target / steps
          let current = 0
          const timer = setInterval(() => {
            current += increment
            if (current >= target) {
              setDisplayValue(target)
              clearInterval(timer)
            } else {
              setDisplayValue(Math.round(current))
            }
          }, duration / steps)
        }
      },
      { threshold: 0.3 }
    )

    observer.observe(el)
    return () => observer.disconnect()
  }, [value])

  return (
    <div
      ref={ref}
      className={`relative group bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5 overflow-hidden transition-all duration-300 hover:scale-[1.03] hover:shadow-lg border-l-4 ${accentBorders[color]} ${hoverShadows[color]}`}
    >
      <div className="absolute top-0 right-0 w-32 h-32 -translate-y-8 translate-x-8 opacity-[0.03] dark:opacity-[0.05]">
        <div className={`w-full h-full rounded-full bg-gradient-to-br ${gradients[color]}`} />
      </div>

      <div className="flex items-center justify-between relative z-10">
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-gray-500 dark:text-gray-400 truncate">{title}</p>
          <p className="text-3xl font-bold text-gray-900 dark:text-white mt-1.5 tabular-nums tracking-tight">
            {prefix && <span className="text-lg font-medium text-gray-500 dark:text-gray-400 mr-1">{prefix}</span>}
            {displayValue.toLocaleString()}
          </p>
          {subtitle && (
            <p className="text-xs text-gray-400 dark:text-gray-500 mt-1 truncate">{subtitle}</p>
          )}
          {trend !== undefined && (
            <p className={`text-xs font-medium mt-1.5 flex items-center gap-1 ${trend >= 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-600 dark:text-red-400'}`}>
              <span className="text-base leading-none">{trend >= 0 ? '↑' : '↓'}</span>
              <span>{Math.abs(trend)}% vs last period</span>
            </p>
          )}
        </div>
        <div className={`p-3.5 rounded-2xl ${iconBg[color]} transition-all duration-300 group-hover:scale-110 group-hover:rotate-3`}>
          <Icon className={`w-6 h-6 ${iconColors[color]}`} />
        </div>
      </div>

      <div className={`absolute bottom-0 left-0 right-0 h-0.5 bg-gradient-to-r ${gradients[color]} scale-x-0 group-hover:scale-x-100 transition-transform duration-500 origin-left`} />
    </div>
  )
}
