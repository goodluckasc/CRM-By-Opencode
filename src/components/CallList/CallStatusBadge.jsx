import { CALL_STATUS_OPTIONS } from '../../utils/constants'

export default function CallStatusBadge({ status }) {
  const option = CALL_STATUS_OPTIONS.find((o) => o.value === status)

  if (!option) {
    return (
      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300">
        Unknown
      </span>
    )
  }

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${option.color}`}>
      {option.label}
    </span>
  )
}
