import { useState, useEffect, useCallback } from 'react'
import { getAllCustomers, getAllCalls } from '../firebase/services'
import { isDueToday, isDueTomorrow, isOverdue } from '../utils/helpers'

export default function useNotifications() {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  const fetch = useCallback(async () => {
    try {
      const [customers, calls] = await Promise.all([getAllCustomers(), getAllCalls()])
      const callMap = {}
      for (const call of calls) {
        const existing = callMap[call.customerId]
        if (!existing || (call.createdAt?.seconds || 0) > (existing.createdAt?.seconds || 0)) {
          callMap[call.customerId] = call
        }
      }

      const list = []
      for (const c of customers) {
        const latestCall = callMap[c.id]
        const lastStatus = latestCall?.status

        if (isOverdue(c.lastServiceDate, lastStatus)) {
          list.push({ customer: c, type: 'overdue', label: 'Overdue' })
        } else if (isDueToday(c.lastServiceDate)) {
          list.push({ customer: c, type: 'due_today', label: 'Due Today' })
        } else if (isDueTomorrow(c.lastServiceDate)) {
          list.push({ customer: c, type: 'due_tomorrow', label: 'Due Tomorrow' })
        }
      }

      setNotifications(list)
    } catch {
      // silent
    }
    setLoading(false)
  }, [])

  useEffect(() => {
    fetch()
    const interval = setInterval(fetch, 60000)
    return () => clearInterval(interval)
  }, [fetch])

  return { notifications, count: notifications.length, loading, refresh: fetch }
}
