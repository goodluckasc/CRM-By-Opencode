import { useEffect, useState } from 'react'
import { Phone, MessageCircle, CheckCircle, Upload, Edit, Trash2 } from 'lucide-react'
import { getAllCustomers, getAllCalls, addCallRecord, updateCallRecord, deleteCustomer, updateCustomer, addOrUpdateCustomer, addAuditLog } from '../../firebase/services'
import { useAuth } from '../../contexts/AuthContext'
import { formatDate, getDaysSince, isDueToday, isOverdue } from '../../utils/helpers'
import { CALL_STATUS_OPTIONS, getWhatsAppMessage, FOLLOW_UP_RULES } from '../../utils/constants'
import CallStatusBadge from './CallStatusBadge'
import SearchBar from '../Common/SearchBar'
import LoadingSpinner from '../Common/LoadingSpinner'
import ExportButton from '../Common/ExportButton'
import Modal from '../Common/Modal'
import Pagination from '../Common/Pagination'
import ImportModal from '../Customers/ImportModal'
import CustomerForm from '../Customers/CustomerForm'

const ITEMS_PER_PAGE = 15

export default function CallListContent() {
  const { user, userData, isAdmin } = useAuth()
  const [customers, setCustomers] = useState([])
  const [calls, setCalls] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [selectedStatus, setSelectedStatus] = useState('all')
  const [page, setPage] = useState(1)
  const [callModal, setCallModal] = useState(null)
  const [callNotes, setCallNotes] = useState('')
  const [callStatus, setCallStatus] = useState('')
  const [processing, setProcessing] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editCustomer, setEditCustomer] = useState(null)

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

  const getLatestCallStatus = (customerId) => {
    const customerCalls = calls.filter((c) => c.customerId === customerId)
    if (customerCalls.length === 0) return null
    return customerCalls.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0))[0]
  }

  const dueCustomers = customers.filter((c) => {
    const due = isDueToday(c.lastServiceDate) || isOverdue(c.lastServiceDate) || getDaysSince(c.lastServiceDate) >= 30
    if (!due) return false
    const latestCall = getLatestCallStatus(c.id)
    if (!latestCall) return true
    const removedStatuses = ['service_booked', 'vehicle_sold', 'not_interested', 'wrong_number']
    if (removedStatuses.includes(latestCall.status)) return false
    return true
  })

  const filtered = dueCustomers.filter((c) => {
    const s = search.toLowerCase()
    return !search ||
      c.customerName?.toLowerCase().includes(s) ||
      c.mobileNumber?.includes(s) ||
      c.vehicleNumber?.toLowerCase().includes(s) ||
      c.dcNumber?.toLowerCase().includes(s)
  })

  const totalPages = Math.ceil(filtered.length / ITEMS_PER_PAGE)
  const paginated = filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE)

  const handleStatusUpdate = async () => {
    if (!callModal || !callStatus) return
    setProcessing(true)
    try {
      const latestCall = getLatestCallStatus(callModal.id)
      const callData = {
        customerId: callModal.id,
        customerName: callModal.customerName,
        vehicleNumber: callModal.vehicleNumber,
        dcNumber: callModal.dcNumber,
        mobileNumber: callModal.mobileNumber,
        status: callStatus,
        notes: callNotes,
        calledBy: userData?.displayName || user?.email,
        calledAt: new Date(),
      }

      if (latestCall && latestCall.status === 'pending') {
        await updateCallRecord(latestCall.id, callData)
      } else {
        await addCallRecord(callData)
      }

      await addAuditLog('call_update', user.uid, {
        customerName: callModal.customerName,
        status: callStatus,
      })

      const refreshedCalls = await getAllCalls()
      setCalls(refreshedCalls)
      setCallModal(null)
      setCallNotes('')
      setCallStatus('')
    } catch (err) {
      console.error(err)
    }
    setProcessing(false)
  }

  const loadCustomers = async () => {
    const [custData, callData] = await Promise.all([getAllCustomers(), getAllCalls()])
    setCustomers(custData)
    setCalls(callData)
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
    try {
      await deleteCustomer(id)
      await addAuditLog('delete_customer', user.uid, { name })
      await loadCustomers()
    } catch (err) {
      console.error('Delete failed:', err)
      alert('Failed to delete customer. Please try again.')
    }
  }

  const handleImport = async (data) => {
    const result = await addOrUpdateCustomer(data)
    await addAuditLog(result.action === 'updated' ? 'update_customer' : 'add_customer', user.uid, { name: data.customerName })
    await loadCustomers()
    return result
  }

  const exportColumns = [
    { key: 'serviceType', label: 'Service Type' },
    { key: 'dcNumber', label: 'DC No' },
    { key: 'vehicleNumber', label: 'Vehicle No' },
    { key: 'model', label: 'Model No' },
    { key: 'customerName', label: 'Customer Name' },
    { key: 'location', label: 'Location' },
    { key: 'mobileNumber', label: 'Mobile No' },
    { key: 'lastServiceDate', label: 'Last Attend' },
    { key: 'totalVisits', label: 'Visit' },
  ]

  const openCallModal = (customer) => {
    const latestCall = getLatestCallStatus(customer.id)
    setCallModal(customer)
    setCallStatus(latestCall?.status || 'pending')
    setCallNotes(latestCall?.notes || '')
  }

  if (loading) return <LoadingSpinner size="lg" />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Today's Call List</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400">{filtered.length} customers due for follow-up</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <ExportButton data={filtered} filename="call-list" columns={exportColumns} />
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="flex-1">
          <SearchBar
            value={search}
            onChange={(v) => { setSearch(v); setPage(1) }}
            placeholder="Search by name, phone, vehicle..."
          />
        </div>
        <select
          value={selectedStatus}
          onChange={(e) => setSelectedStatus(e.target.value)}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="all">All Status</option>
          {CALL_STATUS_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
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
                <th className="text-left px-2 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={12} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">
                    No customers due for follow-up today
                  </td>
                </tr>
              ) : (
                paginated.map((customer, idx) => {
                  const latestCall = getLatestCallStatus(customer.id)
                  const overdue = isOverdue(customer.lastServiceDate)
                  return (
                    <tr key={customer.id} className={`${overdue ? 'bg-red-50 dark:bg-red-900/10' : 'hover:bg-gray-50 dark:hover:bg-gray-700/50'}`}>
                      <td className="hidden md:table-cell px-2 py-3 text-gray-500 dark:text-gray-400 text-xs whitespace-nowrap">{(page - 1) * ITEMS_PER_PAGE + idx + 1}</td>
                      <td className="hidden lg:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.serviceType || '-'}</td>
                      <td className="hidden lg:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.dcNumber || '-'}</td>
                      <td className="px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.vehicleNumber}</td>
                      <td className="hidden lg:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.model || '-'}</td>
                      <td className="px-2 py-3 font-medium text-gray-900 dark:text-white text-xs whitespace-nowrap">{customer.customerName}</td>
                      <td className="hidden lg:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.location || '-'}</td>
                      <td className="px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.mobileNumber}</td>
                      <td className="hidden md:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{formatDate(customer.lastServiceDate)}</td>
                      <td className="px-2 py-3 text-xs whitespace-nowrap">
                        <CallStatusBadge status={latestCall?.status || 'pending'} />
                      </td>
                      <td className="hidden md:table-cell px-2 py-3 text-gray-600 dark:text-gray-400 text-xs whitespace-nowrap">{customer.totalVisits || 0}</td>
                      <td className="px-2 py-3 whitespace-nowrap">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => openCallModal(customer)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-xs font-medium"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            Update
                          </button>
                          <a
                            href={`https://wa.me/${customer.mobileNumber}?text=${getWhatsAppMessage()}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="p-2 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/30 text-green-600"
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
                        </div>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Pagination currentPage={page} totalPages={totalPages} onPageChange={setPage} />

      <ImportModal open={showImport} onClose={() => setShowImport(false)} onImport={handleImport} />

      <Modal open={!!editCustomer} onClose={() => setEditCustomer(null)} title="Edit Customer">
        <CustomerForm onSubmit={handleEdit} onClose={() => setEditCustomer(null)} initialData={editCustomer} />
      </Modal>

      <Modal open={!!callModal} onClose={() => setCallModal(null)} title={`Update Call Status - ${callModal?.customerName || ''}`}>
        <div className="space-y-4">
          <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-3">
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <span className="text-gray-500 dark:text-gray-400">Vehicle:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">{callModal?.vehicleNumber}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Mobile:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">{callModal?.mobileNumber}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">DC No:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">{callModal?.dcNumber || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Model:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">{callModal?.model || '-'}</span>
              </div>
              <div>
                <span className="text-gray-500 dark:text-gray-400">Last Service:</span>
                <span className="ml-2 text-gray-900 dark:text-white font-medium">{formatDate(callModal?.lastServiceDate)}</span>
              </div>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Call Status *</label>
            <select
              value={callStatus}
              onChange={(e) => setCallStatus(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">Select Status</option>
              {CALL_STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
          </div>

          {callStatus && FOLLOW_UP_RULES[callStatus] && (
            <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-3 text-sm text-blue-700 dark:text-blue-400">
              <p className="font-medium">Next Action:</p>
              <p>{FOLLOW_UP_RULES[callStatus].label}</p>
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
            <textarea
              value={callNotes}
              onChange={(e) => setCallNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Add any notes about the call..."
            />
          </div>

          <div className="flex justify-end gap-3">
            <button
              onClick={() => setCallModal(null)}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
            >
              Cancel
            </button>
            <button
              onClick={handleStatusUpdate}
              disabled={!callStatus || processing}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
            >
              <CheckCircle className="w-4 h-4" />
              {processing ? 'Saving...' : 'Save Status'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
