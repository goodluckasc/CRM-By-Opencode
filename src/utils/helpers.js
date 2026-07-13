import { format, differenceInDays, addDays, isPast, isToday, isTomorrow } from 'date-fns'
import { REMINDER_INTERVAL_DAYS, FOLLOW_UP_RULES } from './constants'

export const formatDate = (date) => {
  if (!date) return '-'
  return format(new Date(date.seconds ? date.seconds * 1000 : date), 'dd/MM/yyyy')
}

export const formatDateFull = (date) => {
  if (!date) return '-'
  return format(new Date(date.seconds ? date.seconds * 1000 : date), 'PPP')
}

export const getDaysSince = (date) => {
  if (!date) return 0
  const d = new Date(date.seconds ? date.seconds * 1000 : date)
  return differenceInDays(new Date(), d)
}

export const getNextCallDate = (lastServiceDate) => {
  if (!lastServiceDate) return null
  const d = new Date(lastServiceDate.seconds ? lastServiceDate.seconds * 1000 : lastServiceDate)
  return addDays(d, REMINDER_INTERVAL_DAYS)
}

export const isDue = (lastServiceDate) => {
  if (!lastServiceDate) return false
  const nextDate = getNextCallDate(lastServiceDate)
  if (!nextDate) return false
  return isPast(nextDate) || format(new Date(), 'yyyy-MM-dd') === format(nextDate, 'yyyy-MM-dd')
}

export const isDueToday = (lastServiceDate) => {
  if (!lastServiceDate) return false
  const nextDate = getNextCallDate(lastServiceDate)
  return nextDate ? isToday(nextDate) : false
}

export const isDueTomorrow = (lastServiceDate) => {
  if (!lastServiceDate) return false
  const nextDate = getNextCallDate(lastServiceDate)
  return nextDate ? isTomorrow(nextDate) : false
}

export const isOverdue = (lastServiceDate, callStatus) => {
  if (!lastServiceDate) return false
  if (callStatus === 'service_booked' || callStatus === 'vehicle_sold' || callStatus === 'not_interested') return false
  const nextDate = getNextCallDate(lastServiceDate)
  if (!nextDate) return false
  return differenceInDays(new Date(), nextDate) > 0
}

export const getNextFollowUpDate = (currentStatus) => {
  const rule = FOLLOW_UP_RULES[currentStatus]
  if (!rule) return null
  if (rule.type === 'remove') return null
  if (rule.type === 'delay') {
    if (rule.hours) return addDays(new Date(), 0)
    if (rule.days) return addDays(new Date(), rule.days)
  }
  if (rule.type === 'follow_up') {
    return addDays(new Date(), rule.days || 30)
  }
  return null
}

export const generateId = () => {
  return Date.now().toString(36) + Math.random().toString(36).substring(2)
}

export const getGreeting = () => {
  const hour = new Date().getHours()
  if (hour < 12) return 'Good Morning'
  if (hour < 18) return 'Good Afternoon'
  return 'Good Evening'
}
