import { useEffect, useState } from 'react'
import { Car, Phone, Clock, Calendar, CalendarPlus, Headphones, XCircle, CheckCircle, AlertTriangle, ClipboardList, DollarSign, TrendingUp } from 'lucide-react'
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts'
import SummaryCard from './SummaryCard'
import { getAllCustomers, getAllCalls, getAllJobCards, getAllInventory } from '../../firebase/services'
import { isDueToday, isDueTomorrow, isOverdue } from '../../utils/helpers'
import LoadingSpinner from '../Common/LoadingSpinner'

const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#EC4899', '#14B8A6']

export default function DashboardContent() {
  const [customers, setCustomers] = useState([])
  const [calls, setCalls] = useState([])
  const [jobCards, setJobCards] = useState([])
  const [inventory, setInventory] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadData = async () => {
      try {
        const [custData, callData, jobData, invData] = await Promise.all([
          getAllCustomers(), getAllCalls(), getAllJobCards(), getAllInventory()
        ])
        setCustomers(custData)
        setCalls(callData)
        setJobCards(jobData)
        setInventory(invData)
      } catch (err) {
        console.error('Error loading dashboard data:', err)
      }
      setLoading(false)
    }
    loadData()
  }, [])

  if (loading) return <LoadingSpinner size="lg" />

  const invMap = Object.fromEntries(
    inventory.map((i) => [i.itemCode, { purchasePrice: Number(i.purchasePrice) || 0, salesPrice: Number(i.salesPrice) || 0 }])
  )

  const totalJobCards = jobCards.length
  const totalSales = jobCards.reduce((sum, c) => sum + (Number(c.grandTotal) || 0), 0)
  const totalProfit = jobCards.reduce((sum, c) => {
    const partsCost = (c.parts || []).reduce((s, p) => {
      const inv = invMap[p.itemCode]
      const cost = inv ? Number(p.quantity) * inv.purchasePrice : 0
      return s + cost
    }, 0)
    return sum + (Number(c.grandTotal) || 0) - partsCost - (Number(c.laborCharge) || 0) - (Number(c.otherCharges) || 0)
  }, 0)

  const totalVehicles = customers.length
  const todayCalls = customers.filter((c) => isDueToday(c.lastServiceDate)).length
  const todayCallItems = customers.filter((c) => isDueToday(c.lastServiceDate))
  const completedCalls = calls.filter((c) => c.status && c.status !== 'pending').length
  const pendingCalls = todayCallItems.filter((c) => {
    const lastCall = calls.filter((cl) => cl.customerId === c.id)
    return lastCall.length === 0 || lastCall[0].status === 'pending'
  }).length
  const followUpToday = customers.filter((c) => isDueToday(c.lastServiceDate)).length
  const followUpTomorrow = customers.filter((c) => isDueTomorrow(c.lastServiceDate)).length
  const noAnswer = calls.filter((c) => c.status === 'no_answer').length
  const busy = calls.filter((c) => c.status === 'busy' || c.status === 'customer_busy').length
  const bookedService = calls.filter((c) => c.status === 'service_booked').length
  const overdueCalls = customers.filter((c) => isOverdue(c.lastServiceDate)).length

  const statusData = [
    { name: 'Called', value: calls.filter((c) => c.status === 'called').length },
    { name: 'No Answer', value: calls.filter((c) => c.status === 'no_answer').length },
    { name: 'Busy', value: calls.filter((c) => c.status === 'busy' || c.status === 'customer_busy').length },
    { name: 'Booked', value: calls.filter((c) => c.status === 'service_booked').length },
    { name: 'Pending', value: calls.filter((c) => c.status === 'pending' || !c.status).length },
  ].filter((d) => d.value > 0)

  const weeklyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - i)
    const dateStr = date.toLocaleDateString('en-US', { weekday: 'short' })
    const count = calls.filter((c) => {
      if (!c.createdAt) return false
      const callDate = new Date(c.createdAt.seconds * 1000)
      return callDate.toLocaleDateString('en-US', { weekday: 'short' }) === dateStr
    }).length
    return { name: dateStr, calls: count }
  }).reverse()

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Dashboard Overview</h2>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <SummaryCard title="Total Job Cards" value={totalJobCards} icon={ClipboardList} color="blue" />
        <SummaryCard title="Total Sales" value={totalSales} prefix="BDT" icon={DollarSign} color="green" />
        <SummaryCard title="Total Profit" value={totalProfit} prefix="BDT" icon={TrendingUp} color="teal" />
        <SummaryCard title="Total Vehicles" value={totalVehicles} icon={Car} color="blue" />
        <SummaryCard title="Today's Calls" value={todayCalls} icon={Phone} color="green" subtitle="Due for follow-up" />
        <SummaryCard title="Pending Calls" value={pendingCalls} icon={Clock} color="yellow" />
        <SummaryCard title="Completed Calls" value={completedCalls} icon={CheckCircle} color="teal" />
        <SummaryCard title="Follow-up Today" value={followUpToday} icon={Calendar} color="indigo" />
        <SummaryCard title="Follow-up Tomorrow" value={followUpTomorrow} icon={CalendarPlus} color="purple" />
        <SummaryCard title="No Answer" value={noAnswer} icon={Headphones} color="orange" />
        <SummaryCard title="Busy" value={busy} icon={XCircle} color="red" />
        <SummaryCard title="Booked Service" value={bookedService} icon={Car} color="green" />
        <SummaryCard title="Overdue Calls" value={overdueCalls} icon={AlertTriangle} color="red" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Weekly Call Activity</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={weeklyData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis dataKey="name" stroke="#9CA3AF" />
                <YAxis stroke="#9CA3AF" />
                <Tooltip
                  contentStyle={{
                    backgroundColor: '#1F2937',
                    border: '1px solid #374151',
                    borderRadius: '8px',
                    color: '#F9FAFB',
                  }}
                />
                <Bar dataKey="calls" fill="#3B82F6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 p-5">
          <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Call Status Distribution</h3>
          <div className="h-72">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={statusData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {statusData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  )
}
