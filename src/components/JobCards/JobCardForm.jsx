import { useState, useEffect } from 'react'
import { Plus, Trash2, Search } from 'lucide-react'
import { getAllCustomers, getAllInventory, updateInventory } from '../../firebase/services'
import { SERVICE_TYPES } from '../../utils/constants'

const emptyPart = { itemCode: '', name: '', quantity: 1, rate: 0 }

export default function JobCardForm({ onSubmit, onClose, initialData, jobCardNumber }) {
  const [customers, setCustomers] = useState([])
  const [inventory, setInventory] = useState([])
  const [form, setForm] = useState({
    customerId: initialData?.customerId || '',
    customerName: initialData?.customerName || '',
    mobileNumber: initialData?.mobileNumber || '',
    vehicleNumber: initialData?.vehicleNumber || '',
    model: initialData?.model || '',
    services: initialData?.services || [],
    parts: initialData?.parts || [{ ...emptyPart }],
    laborCharge: initialData?.laborCharge || 0,
    otherCharges: initialData?.otherCharges || 0,
    discount: initialData?.discount || 0,
    notes: initialData?.notes || '',
    serviceDate: initialData?.serviceDate
      ? new Date(initialData.serviceDate.seconds * 1000).toISOString().split('T')[0]
      : new Date().toISOString().split('T')[0],
    status: initialData?.status || 'open',
  })
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [partSearch, setPartSearch] = useState({})

  useEffect(() => {
    getAllCustomers().then(setCustomers).catch(() => {})
    getAllInventory().then(setInventory).catch(() => {})
  }, [])

  const filteredCustomers = customers.filter((c) =>
    !search || c.customerName?.toLowerCase().includes(search.toLowerCase()) ||
    c.mobileNumber?.includes(search) || c.vehicleNumber?.toLowerCase().includes(search)
  )

  const selectCustomer = (c) => {
    setForm({
      ...form,
      customerId: c.id,
      customerName: c.customerName || '',
      mobileNumber: c.mobileNumber || '',
      vehicleNumber: c.vehicleNumber || '',
      model: c.model || '',
    })
    setSearch('')
  }

  const toggleService = (service) => {
    const exists = form.services.includes(service)
    setForm({
      ...form,
      services: exists ? form.services.filter((s) => s !== service) : [...form.services, service],
    })
  }

  const updatePart = (index, field, value) => {
    const parts = [...form.parts]
    parts[index] = { ...parts[index], [field]: value }
    if (field === 'itemCode') {
      setPartSearch({ ...partSearch, [index]: value })
      const match = inventory.find((i) =>
        i.itemCode?.toLowerCase() === value.toLowerCase()
      )
      if (match) {
        parts[index] = {
          ...parts[index],
          itemCode: match.itemCode,
          name: match.name,
          rate: match.sellingPrice || 0,
          inventoryId: match.id,
        }
        setPartSearch({ ...partSearch, [index]: '' })
      }
    }
    setForm({ ...form, parts })
  }

  const selectInventoryPart = (index, item) => {
    const parts = [...form.parts]
    parts[index] = {
      ...parts[index],
      itemCode: item.itemCode,
      name: item.name,
      rate: item.sellingPrice || 0,
      inventoryId: item.id,
    }
    setPartSearch({ ...partSearch, [index]: '' })
    setForm({ ...form, parts })
  }

  const addPart = () => setForm({ ...form, parts: [...form.parts, { ...emptyPart }] })

  const removePart = (index) => {
    if (form.parts.length <= 1) return
    setForm({ ...form, parts: form.parts.filter((_, i) => i !== index) })
  }

  const partsTotal = form.parts.reduce((sum, p) => sum + (p.quantity || 0) * (p.rate || 0), 0)
  const grandTotal = partsTotal + Number(form.laborCharge) + Number(form.otherCharges) - Number(form.discount)

  const deductInventory = async (parts) => {
    for (const p of parts) {
      if (p.inventoryId && p.quantity > 0) {
        const inv = inventory.find((i) => i.id === p.inventoryId)
        if (inv) {
          const newQty = Math.max(0, (Number(inv.quantity) || 0) - Number(p.quantity))
          await updateInventory(p.inventoryId, { quantity: newQty })
        }
      }
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if (!form.customerName || !form.vehicleNumber) return
    setLoading(true)
    try {
      const { Timestamp } = await import('firebase/firestore')
      const data = {
        ...form,
        jobCardNumber: initialData?.jobCardNumber || jobCardNumber,
        partsTotal,
        grandTotal,
        serviceDate: Timestamp.fromDate(new Date(form.serviceDate)),
      }
      if (!initialData) delete data.status
      await onSubmit(data)
      await deductInventory(data.parts)
      onClose()
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value })

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          {initialData ? 'Edit Job Card' : 'New Job Card'}
        </h3>
        <span className="text-sm font-mono text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-900/20 px-3 py-1 rounded-lg">
          {initialData?.jobCardNumber || jobCardNumber || '...'}
        </span>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer *</label>
        {!form.customerId ? (
          <div>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by name, mobile, or vehicle number..."
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            {search && filteredCustomers.length > 0 && (
              <div className="mt-1 max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700">
                {filteredCustomers.slice(0, 10).map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    onClick={() => selectCustomer(c)}
                    className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-0"
                  >
                    <span className="font-medium">{c.customerName}</span>
                    <span className="text-gray-500 ml-2">{c.vehicleNumber}</span>
                    <span className="text-gray-400 ml-2 text-xs">{c.mobileNumber}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center justify-between px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700">
            <div className="text-sm">
              <span className="font-medium text-gray-900 dark:text-white">{form.customerName}</span>
              <span className="text-gray-500 ml-2">{form.vehicleNumber}</span>
              <span className="text-gray-400 ml-2 text-xs">{form.mobileNumber}</span>
            </div>
            <button
              type="button"
              onClick={() => setForm({ ...form, customerId: '', customerName: '', mobileNumber: '', vehicleNumber: '', model: '' })}
              className="text-xs text-red-600 hover:text-red-700"
            >
              Change
            </button>
          </div>
        )}
      </div>

      {form.customerId && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Customer Name</label>
            <input type="text" value={form.customerName} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Mobile Number</label>
            <input type="text" value={form.mobileNumber} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Vehicle Number</label>
            <input type="text" value={form.vehicleNumber} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Model</label>
            <input type="text" value={form.model} readOnly className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-sm text-gray-900 dark:text-white" />
          </div>
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Services</label>
        <div className="flex flex-wrap gap-2">
          {SERVICE_TYPES.map((s) => (
            <button
              key={s}
              type="button"
              onClick={() => toggleService(s)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                form.services.includes(s)
                  ? 'bg-blue-600 text-white border-blue-600'
                  : 'bg-white dark:bg-gray-700 text-gray-600 dark:text-gray-400 border-gray-300 dark:border-gray-600 hover:border-blue-400'
              }`}
            >
              {s}
            </button>
          ))}
        </div>
      </div>

      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">Parts / Materials</label>
          <button type="button" onClick={addPart} className="flex items-center gap-1 text-xs text-blue-600 hover:text-blue-700 font-medium">
            <Plus className="w-3 h-3" /> Add Part
          </button>
        </div>
        <div className="space-y-2">
          {form.parts.map((part, i) => {
            const searchVal = partSearch[i] || ''
            const filteredInv = searchVal
              ? inventory.filter((inv) =>
                  inv.itemCode?.toLowerCase().includes(searchVal.toLowerCase()) ||
                  inv.name?.toLowerCase().includes(searchVal.toLowerCase())
                ).slice(0, 8)
              : []
            return (
              <div key={i} className="space-y-1">
                <div className="flex items-center gap-2">
                  <div className="relative flex-1">
                    <input
                      type="text"
                      value={searchVal || part.itemCode}
                      onChange={(e) => updatePart(i, 'itemCode', e.target.value)}
                      placeholder="Type item code or name..."
                      className="w-full px-3 py-2 pr-8 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    <Search className="absolute right-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" />
                    {filteredInv.length > 0 && (
                      <div className="absolute z-10 mt-1 w-full max-h-40 overflow-y-auto border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 shadow-lg">
                        {filteredInv.map((inv) => (
                          <button
                            key={inv.id}
                            type="button"
                            onClick={() => selectInventoryPart(i, inv)}
                            className="w-full text-left px-3 py-2 text-sm text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-600 border-b border-gray-100 dark:border-gray-600 last:border-0"
                          >
                            <span className="font-mono font-medium text-blue-600 dark:text-blue-400">{inv.itemCode}</span>
                            <span className="ml-2">{inv.name}</span>
                            <span className="text-gray-400 ml-1 text-xs">({inv.quantity} {inv.unit})</span>
                            <span className="text-gray-500 ml-auto float-right">BDT {inv.sellingPrice || 0}</span>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <input
                    type="number"
                    value={part.quantity}
                    onChange={(e) => updatePart(i, 'quantity', Math.max(1, Number(e.target.value)))}
                    className="w-16 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white text-center focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="1"
                  />
                  <input
                    type="number"
                    value={part.rate}
                    onChange={(e) => updatePart(i, 'rate', Number(e.target.value))}
                    placeholder="Rate"
                    className="w-24 px-2 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
                    min="0"
                  />
                  <span className="text-sm text-gray-500 dark:text-gray-400 w-20 text-right font-medium">
                    {(part.quantity * part.rate).toLocaleString()}
                  </span>
                  <button type="button" onClick={() => removePart(i)} className="p-1.5 text-red-500 hover:text-red-600">
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
                {part.inventoryId && (
                  <p className="text-[10px] text-green-600 dark:text-green-400 ml-1">
                    Inventory: {part.itemCode} — {part.name}
                  </p>
                )}
              </div>
            )
          })}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Labor Charge</label>
          <input
            type="number"
            name="laborCharge"
            value={form.laborCharge}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Other Charges</label>
          <input
            type="number"
            name="otherCharges"
            value={form.otherCharges}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Discount</label>
          <input
            type="number"
            name="discount"
            value={form.discount}
            onChange={handleChange}
            min="0"
            className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white text-right focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      </div>

      <div className="bg-gray-50 dark:bg-gray-900/50 rounded-lg p-4 space-y-1">
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Parts Total</span>
          <span>BDT {partsTotal.toLocaleString()}</span>
        </div>
        <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
          <span>Labor Charge</span>
          <span>BDT {Number(form.laborCharge).toLocaleString()}</span>
        </div>
        {Number(form.otherCharges) > 0 && (
          <div className="flex justify-between text-sm text-gray-600 dark:text-gray-400">
            <span>Other Charges</span>
            <span>BDT {Number(form.otherCharges).toLocaleString()}</span>
          </div>
        )}
        {Number(form.discount) > 0 && (
          <div className="flex justify-between text-sm text-red-600 dark:text-red-400">
            <span>Discount</span>
            <span>- BDT {Number(form.discount).toLocaleString()}</span>
          </div>
        )}
        <div className="flex justify-between text-base font-bold text-gray-900 dark:text-white pt-2 border-t border-gray-200 dark:border-gray-700">
          <span>Grand Total</span>
          <span>BDT {grandTotal.toLocaleString()}</span>
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Service Date</label>
        <input
          type="date"
          name="serviceDate"
          value={form.serviceDate}
          onChange={handleChange}
          required
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">Notes</label>
        <textarea
          name="notes"
          value={form.notes}
          onChange={handleChange}
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
        />
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onClose}
          className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-lg text-sm font-medium text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={loading || !form.customerName || !form.vehicleNumber}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? 'Saving...' : initialData ? 'Update Job Card' : 'Create Job Card'}
        </button>
      </div>
    </form>
  )
}
