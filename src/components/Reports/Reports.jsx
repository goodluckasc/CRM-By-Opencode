import { useEffect, useState } from 'react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend, LineChart, Line } from 'recharts'
import { getAllCustomers, getAllCalls } from '../../firebase/services'
import LoadingSpinner from '../Common/LoadingSpinner'
import ExportButton from '../Common/ExportButton'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6', '#F97316']

export default function ReportsContent() {
  const [customers, setCustomers] = useState([])
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [custData, callData] = await Promise.all([getAllCustomers(), getAllCalls()])
        setCustomers(custData)
        setCalls(callData)
      } catch (err) {
        console.error(err)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return <LoadingSpinner size="lg" />

  const locationData = customers.reduce((acc, c) => {
    const loc = c.location || 'Unknown'
    acc[loc] = (acc[loc] || 0) + 1
    return acc
  }, {})
  const locationChartData = Object.entries(locationData).map(([name, value]) => ({ name, value }))

  const modelData = customers.reduce((acc, c) => {
    const model = c.model || 'Unknown'
    acc[model] = (acc[model] || 0) + 1
    return acc
  }, {})
  const modelChartData = Object.entries(modelData).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }))

  const statusData = [
    { name: 'Called', value: calls.filter((c) => c.status === 'called').length },
    { name: 'No Answer', value: calls.filter((c) => c.status === 'no_answer').length },
    { name: 'Busy', value: calls.filter((c) => c.status === 'busy' || c.status === 'customer_busy').length },
    { name: 'Service Booked', value: calls.filter((c) => c.status === 'service_booked').length },
    { name: 'Will Visit', value: calls.filter((c) => c.status === 'will_visit_today' || c.status === 'will_visit_tomorrow').length },
    { name: 'Not Interested', value: calls.filter((c) => c.status === 'not_interested').length },
    { name: 'Other', value: calls.filter((c) => !['called', 'no_answer', 'busy', 'customer_busy', 'service_booked', 'will_visit_today', 'will_visit_tomorrow', 'not_interested'].includes(c.status)).length },
  ].filter((d) => d.value > 0)

  const conversionRate = calls.length > 0
    ? Math.round((calls.filter((c) => c.status === 'service_booked').length / calls.length) * 100)
    : 0

  const staffData = calls.reduce((acc, c) => {
    const staff = c.calledBy || 'Unknown'
    if (!acc[staff]) {
      acc[staff] = { name: staff, total: 0, booked: 0, called: 0 }
    }
    acc[staff].total++
    if (c.status === 'service_booked') acc[staff].booked++
    if (c.status === 'called') acc[staff].called++
    return acc
  }, {})
  const staffChartData = Object.values(staffData)

  const monthlyCalls = Array.from({ length: 12 }, (_, i) => {
    const month = new Date()
    month.setMonth(month.getMonth() - i)
    const monthStr = month.toLocaleDateString('en-US', { month: 'short', year: '2-digit' })
    const monthNum = month.getMonth()
    const year = month.getFullYear()
    const count = calls.filter((c) => {
      if (!c.createdAt) return false
      const d = new Date(c.createdAt.seconds * 1000)
      return d.getMonth() === monthNum && d.getFullYear() === year
    }).length
    return { name: monthStr, calls: count }
  }).reverse()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Reports</h2>
        <div className="flex gap-2">
          <ExportButton
            data={customers}
            filename="daily_call_report"
            columns={['customerName', 'mobileNumber', 'vehicleNumber', 'model', 'location', 'serviceType']}
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Total Calls Made</p>
          <p className="text-2xl font-bold text-gray-900 dark:text-white mt-1">{calls.length}</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Service Conversion Rate</p>
          <p className="text-2xl font-bold text-green-600 dark:text-green-400 mt-1">{conversionRate}%</p>
        </div>
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <p className="text-sm text-gray-500 dark:text-gray-400">Service Booked</p>
          <p className="text-2xl font-bold text-blue-600 dark:text-blue-400 mt-1">{calls.filter((c) => c.status === 'service_booked').length}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Call Status Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={statusData} cx="50%" cy="50%" outerRadius={90} label dataKey="value">
                  {statusData.map((e, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Monthly Call Activity</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={monthlyCalls}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB' }} />
                <Line type="monotone" dataKey="calls" stroke="#3B82F6" strokeWidth={2} dot={{ fill: '#3B82F6' }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Location-wise Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={locationChartData} layout="vertical">
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis type="number" stroke="#9CA3AF" />
                <YAxis type="category" dataKey="name" stroke="#9CA3AF" width={80} />
                <Tooltip contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151', borderRadius: '8px', color: '#F9FAFB' }} />
                <Bar dataKey="value" fill="#3B82F6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Model-wise Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie data={modelChartData} cx="50%" cy="50%" outerRadius={90} label dataKey="value">
                  {modelChartData.map((e, i) => (
                    <Cell key={i} fill={COLORS[i % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {staffChartData.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Staff Performance</h3>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Staff</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Total Calls</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Called</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Service Booked</th>
                  <th className="text-left px-4 py-3 font-medium text-gray-500 dark:text-gray-400">Conversion Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {staffChartData.map((staff, i) => (
                  <tr key={i}>
                    <td className="px-4 py-3 font-medium text-gray-900 dark:text-white">{staff.name}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{staff.total}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{staff.called}</td>
                    <td className="px-4 py-3 text-gray-600 dark:text-gray-400">{staff.booked}</td>
                    <td className="px-4 py-3">
                      <span className="font-medium text-green-600 dark:text-green-400">
                        {staff.total > 0 ? Math.round((staff.booked / staff.total) * 100) : 0}%
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
