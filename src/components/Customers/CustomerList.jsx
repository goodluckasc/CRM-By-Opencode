import { useEffect, useState } from 'react'
import { Plus, Upload, Edit, Trash2, Phone as PhoneIcon, MessageCircle, ChevronDown, ChevronUp } from 'lucide-react'
import { getAllCustomers, getAllCalls, deleteCustomer, updateCustomer, addOrUpdateCustomer, addAuditLog, getCustomerCalls } from '../../firebase/services'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, getDaysSince, isOverdue } from '../../utils/helpers'
import { WHATSAPP_MESSAGE } from '../../utils/constants'
import SearchBar from '../Common/SearchBar'
import LoadingSpinner from '../Common/LoadingSpinner'
import ExportButton from '../Common/ExportButton'
import Modal from '../Common/Modal'
import Pagination from '../Common/Pagination'
import CustomerForm from './CustomerForm'
import ImportModal from './ImportModal'

const ITEMS_PER_PAGE = 10

export default function CustomerList() {
  const { user, isAdmin } = useAuth()
  const [customers, setCustomers] = useState([])
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)
  const [page, setPage] = useState(1)
  const [filterLocation, setFilterLocation] = useState('')
  const [filterModel, setFilterModel] = useState('')
  const [filterService, setFilterService] = useState('')
  const [filterDue, setFilterDue] = useState('all')
  const [expandedId, setExpandedId] = useState(null)
  const [callHistory, setCallHistory] = useState({})

  useEffect(() => {
    loadCustomers()
  }, [])

  const loadCustomers = async () => {
    try {
      const [custData, callData] = await Promise.all([getAllCustomers(), getAllCalls()])
      setCustomers(custData)
      setCalls(callData)
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleAdd = async (data) => {
    const result = await addOrUpdateCustomer(data)
    await addAuditLog(result.action === 'updated' ? 'update_customer' : 'add_customer', user.uid, { name: data.customerName })
    await loadCustomers()
    return result
  }

  const handleEdit = async (data) => {
    if (!editCustomer) return
    try {
      await updateCustomer(editCustomer.id, data)
      await addAuditLog('edit_customer', user.uid, { name: data.customerName })
      setEditCustomer(null)
      await loadCustomers()
    } catch (err) {
      console.error('Edit failed:', err)
      alert('Failed to update customer. Please try again.')
    }
  }

  const handleDelete = async (id, name) => {
    if (!window.confirm('Are you sure you want to delete this customer?')) return
    await deleteCustomer(id)
    await addAuditLog('delete_customer', user.uid, { name })
    await loadCustomers()
  }

  const loadCallHistory = async (customerId) => {
    if (callHistory[customerId]) return
    const calls = await getCustomerCalls(customerId)
    setCallHistory((prev) => ({ ...prev, [customerId]: calls }))
  }

  const toggleExpand = async (id) => {
    if (expandedId === id) {
      setExpandedId(null)
    } else {
      setExpandedId(id)
      await loadCallHistory(id)
    }
  }

  const filtered = customers.filter((c) => {
    const s = search.toLowerCase()
    const matchesSearch =
      !search ||
      c.customerName?.toLowerCase().includes(s) ||
      c.mobileNumber?.includes(s) ||
      c.vehicleNumber?.toLowerCase().includes(s) ||
      c.dcNumber?.toLowerCase().includes(s)
    const matchesLocation = !filterLocation || c.location === filterLocation
    const matchesModel = !filterModel || c.model === filterModel
    const matchesService = !filterService || c.serviceType === filterService
    let matchesDue = true
    if (filterDue === 'due') matchesDue = isOverdue(c.lastServiceDate) || getDaysSince(c.lastServiceDate) >= 30
    else if (filterDue === 'overdue') matchesDue = isOverdue(c.lastServiceDate)
    else if (filterDue === 'completed') matchesDue = false
    return matchesSearch && matchesLocation && matchesModel && matchesService && matchesDue
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const exportColumns = ['serviceType', 'dcNumber', 'vehicleNumber', 'model', 'customerName', 'location', 'mobileNumber', 'lastServiceDate', 'totalVisits']

  if (loading) return <LoadingSpinner size="lg" />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Customer Database</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <ExportButton data={filtered} filename="customers" columns={exportColumns} />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Customer
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
        <SearchBar
          value={search}
          onChange={setSearch}
          placeholder="Search name, phone, vehicle, DC..."
        />
        <select
          value={filterLocation}
          onChange={(e) => { setFilterLocation(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="">All Locations</option>
          {['Dhaka', 'Chattogram', 'Rajshahi', 'Khulna', 'Sylhet', 'Barisal', 'Rangpur', 'Mymensingh'].map((l) => (
            <option key={l} value={l}>{l}</option>
          ))}
        </select>
        <select
          value={filterModel}
          onChange={(e) => { setFilterModel(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="">All Models</option>
          {['Toyota Allion', 'Toyota Premio', 'Toyota Axio', 'Toyota Corolla', 'Toyota Vitz', 'Toyota Fielder', 'Honda Civic', 'Honda Grace', 'Honda Vezel', 'Nissan X-Trail', 'Mitsubishi Pajero', 'Suzuki Alto', 'Suzuki Swift', 'Suzuki Cultus', 'Suzuki Wagon R', 'Other'].map((m) => (
            <option key={m} value={m}>{m}</option>
          ))}
        </select>
        <select
          value={filterService}
          onChange={(e) => { setFilterService(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="">All Services</option>
          {['Regular Service', 'Major Service', 'Oil Change', 'Engine Repair', 'Brake Service', 'AC Service', 'Tire Replacement', 'Battery Replacement', 'Body Repair', 'Denting & Painting', 'Insurance Claim', 'Other'].map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>
        <select
          value={filterDue}
          onChange={(e) => { setFilterDue(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          <option value="due">Due Today</option>
          <option value="overdue">Overdue</option>
          <option value="completed">Completed</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 dark:bg-gray-900/50">
                <th className="hidden md:table-cell text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Sl</th>
                <th className="hidden lg:table-cell text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Service Type</th>
                <th className="hidden lg:table-cell text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">DC No</th>
                <th className="text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Vehicle No</th>
                <th className="hidden lg:table-cell text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Model No</th>
                <th className="text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Customer Name</th>
                <th className="hidden lg:table-cell text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Location</th>
                <th className="text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Mobile No</th>
                <th className="hidden md:table-cell text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Last Attend</th>
                <th className="text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">W/S</th>
                <th className="hidden md:table-cell text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Visit</th>
                <th className="text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No customers found
                  </td>
                </tr>
              ) : (
                paginated.map((customer, idx) => {
                  const overdue = isOverdue(customer.lastServiceDate)
                  const latestCall = calls.filter((c) => c.customerId === customer.id).sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0]
                  return (
                    <>
                      <tr
                        key={customer.id}
                        className={`hover:bg-gray-50 dark:hover:bg-gray-700/50 cursor-pointer ${
                          overdue ? 'bg-red-50 dark:bg-red-900/10' : ''
                        }`}
                        onClick={() => toggleExpand(customer.id)}
                      >
                        <td className="hidden md:table-cell px-2 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{idx + 1 + (page - 1) * ITEMS_PER_PAGE}</td>
                        <td className="hidden lg:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.serviceType || '-'}</td>
                        <td className="hidden lg:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.dcNumber || '-'}</td>
                        <td className="px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.vehicleNumber}</td>
                        <td className="hidden lg:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.model || '-'}</td>
                        <td className="px-2 py-3 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="font-medium text-gray-900 dark:text-white whitespace-nowrap">
                              {customer.customerName}
                            </span>
                            {overdue && (
                              <span className="text-[10px] px-1 py-0.5 rounded bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400 font-medium shrink-0">
                                Overdue
                              </span>
                            )}
                          </div>
                        </td>
                        <td className="hidden lg:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.location || '-'}</td>
                        <td className="px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.mobileNumber}</td>
                        <td className="hidden md:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{formatDate(customer.lastServiceDate)}</td>
                        <td className="px-2 py-3 text-xs whitespace-nowrap">
                          {latestCall ? (
                            <span className={`inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-medium ${
                              latestCall.status === 'called' || latestCall.status === 'service_booked' || latestCall.status === 'will_visit_today' || latestCall.status === 'will_visit_tomorrow'
                                ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                : latestCall.status === 'no_answer' || latestCall.status === 'busy' || latestCall.status === 'customer_busy' || latestCall.status === 'switched_off'
                                ? 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-900/30 dark:text-gray-400'
                            }`}>
                              {latestCall.status.replace(/_/g, ' ')}
                            </span>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
                        <td className="hidden md:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.totalVisits || 0}</td>
                        <td className="px-2 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                            <a
                              href={`tel:${customer.mobileNumber}`}
                              className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                              title="Call"
                            >
                              <PhoneIcon className="w-4 h-4" />
                            </a>
                            <a
                              href={`https://wa.me/${customer.mobileNumber}?text=${WHATSAPP_MESSAGE}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
                              title="WhatsApp"
                            >
                              <MessageCircle className="w-4 h-4" />
                            </a>
                            {isAdmin && (
                              <>
                                <button
                                  onClick={() => setEditCustomer(customer)}
                                  className="p-2 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"
                                >
                                  <Edit className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => handleDelete(customer.id, customer.customerName)}
                                  className="p-2 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                                >
                                  <Trash2 className="w-4 h-4" />
                                </button>
                              </>
                            )}
                            {expandedId === customer.id ? (
                              <ChevronUp className="w-4 h-4 text-gray-400" />
                            ) : (
                              <ChevronDown className="w-4 h-4 text-gray-400" />
                            )}
                          </div>
                        </td>
                      </tr>
                      {expandedId === customer.id && (
                        <tr key={`${customer.id}-detail`}>
                          <td colSpan={12} className="px-4 py-3 bg-gray-50 dark:bg-gray-900/30">
                            <div className="grid grid-cols-2 gap-4 text-sm">
                              <div>
                                <p className="text-gray-500 dark:text-gray-400 text-xs">Chassis Number</p>
                                <p className="text-gray-900 dark:text-white font-medium">{customer.chassisNumber || '-'}</p>
                              </div>
                            </div>
                            {callHistory[customer.id] && callHistory[customer.id].length > 0 && (
                              <div className="mt-3">
                                <p className="text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">Call History</p>
                                <div className="space-y-1">
                                  {callHistory[customer.id].slice(0, 3).map((call) => (
                                    <div key={call.id} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
                                      <span>{formatDate(call.createdAt)}</span>
                                      <span className="px-1.5 py-0.5 rounded bg-gray-100 dark:bg-gray-800">{call.status}</span>
                                      {call.notes && <span className="italic">- {call.notes}</span>}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </td>
                        </tr>
                      )}
                    </>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <Modal open={showForm} onClose={() => setShowForm(false)} title="Add New Customer">
        <CustomerForm onSubmit={handleAdd} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title="Edit Customer">
        <CustomerForm onSubmit={handleEdit} onClose={() => setEditCustomer(null)} initialData={editCustomer} />
      </Modal>

      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImport={handleAdd} />
    </div>
  )
}
