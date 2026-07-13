export const CALL_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending', color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400' },
  { value: 'called', label: 'Called', color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400' },
  { value: 'no_answer', label: 'No Answer', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
  { value: 'busy', label: 'Busy', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'switched_off', label: 'Switched Off', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'wrong_number', label: 'Wrong Number', color: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400' },
  { value: 'customer_busy', label: 'Customer Busy', color: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400' },
  { value: 'vehicle_sold', label: 'Vehicle Sold', color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400' },
  { value: 'service_booked', label: 'Service Booked', color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400' },
  { value: 'will_visit_today', label: 'Will Visit Today', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
  { value: 'will_visit_tomorrow', label: 'Will Visit Tomorrow', color: 'bg-teal-100 text-teal-800 dark:bg-teal-900/30 dark:text-teal-400' },
  { value: 'not_interested', label: 'Not Interested', color: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400' },
]

export const SERVICE_TYPES = [
  'Regular Service',
  'Major Service',
  'Oil Change',
  'Engine Repair',
  'Brake Service',
  'AC Service',
  'Tire Replacement',
  'Battery Replacement',
  'Body Repair',
  'Denting & Painting',
  'Insurance Claim',
  'Other',
]

export const LOCATIONS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Khulna',
  'Sylhet',
  'Barisal',
  'Rangpur',
  'Mymensingh',
]

export const MODELS = [
  'Toyota Allion',
  'Toyota Premio',
  'Toyota Axio',
  'Toyota Corolla',
  'Toyota Vitz',
  'Toyota Fielder',
  'Honda Civic',
  'Honda Grace',
  'Honda Vezel',
  'Nissan X-Trail',
  'Mitsubishi Pajero',
  'Suzuki Alto',
  'Suzuki Swift',
  'Suzuki Cultus',
  'Suzuki Wagon R',
  'Other',
]

export const FOLLOW_UP_RULES = {
  no_answer: { type: 'delay', days: 1, label: 'Remind again tomorrow' },
  busy: { type: 'delay', hours: 2, label: 'Remind after 2 hours' },
  customer_busy: { type: 'delay', days: 3, label: 'Remind after 3 days' },
  service_booked: { type: 'remove', label: 'Remove from reminder list' },
  vehicle_sold: { type: 'remove', label: 'Remove from reminder list' },
  not_interested: { type: 'remove', label: 'Remove from reminder list' },
  wrong_number: { type: 'remove', label: 'Remove from reminder list' },
  called: { type: 'follow_up', days: 30, label: 'Schedule next follow-up in 30 days' },
  will_visit_today: { type: 'follow_up', days: 1, label: 'Follow up after visit' },
  will_visit_tomorrow: { type: 'follow_up', days: 2, label: 'Follow up after visit' },
  switched_off: { type: 'delay', days: 1, label: 'Try again tomorrow' },
}

export const REMINDER_INTERVAL_DAYS = 30

export const DEFAULT_WHATSAPP_MESSAGE =
  'আসসালামু আলাইকুম।\nগুড লাক সার্ভিস সেন্টার থেকে জানানো যাচ্ছে যে, আপনার গাড়ির নির্ধারিত সার্ভিসের সময় হয়ে গেছে। অনুগ্রহ করে দ্রুত আপনার সার্ভিস অ্যাপয়েন্টমেন্ট বুক করতে আমাদের সাথে যোগাযোগ করুন।\nধন্যবাদ।\nগুড লাক সার্ভিস সেন্টার'

export function getWhatsAppMessage() {
  const saved = localStorage.getItem('whatsappMessage')
  return encodeURIComponent(saved || DEFAULT_WHATSAPP_MESSAGE)
}
