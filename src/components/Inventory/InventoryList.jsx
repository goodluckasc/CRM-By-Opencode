import { useCallback, useEffect, useMemo, useState } from 'react'
import { Plus, Upload, Edit, Trash2, Search, AlertTriangle, Package } from 'lucide-react'
import { getAllInventory, addInventory, updateInventory, deleteInventory, addAuditLog } from '../../firebase/services'
import { useAuth } from '../../contexts/AuthContext'
import LoadingSpinner from '../Common/LoadingSpinner'
import ExportButton from '../Common/ExportButton'
import Modal from '../Common/Modal'
import Pagination from '../Common/Pagination'
import InventoryForm from './InventoryForm'
import ImportInventoryModal from './ImportInventoryModal'

const ITEMS_PER_PAGE = 10

export default function InventoryList() {
  const { user, isAdmin } = useAuth()
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [filterCategory, setFilterCategory] = useState('all')
  const [filterStock, setFilterStock] = useState('all')
  const [showForm, setShowForm] = useState(false)
  const [showImport, setShowImport] = useState(false)
  const [editItem, setEditItem] = useState(null)
  const [page, setPage] = useState(1)

  const loadItems = useCallback(async () => {
    try {
      setItems(await getAllInventory())
    } catch (err) {
      console.error(err)
    }
    setLoading(false)
  }, [])

  useEffect(() => { loadItems() }, [loadItems])

  const handleAdd = useCallback(async (data) => {
    await addInventory(data)
    await addAuditLog('add_inventory', user.uid, { name: data.name })
    await loadItems()
  }, [loadItems, user])

  const handleEdit = useCallback(async (data) => {
    if (!editItem) return
    try {
      await updateInventory(editItem.id, data)
      await addAuditLog('edit_inventory', user.uid, { name: data.name })
      setEditItem(null)
      await loadItems()
    } catch (err) {
      console.error(err)
      alert('Failed to update item.')
    }
  }, [editItem, loadItems, user])

  const handleDelete = useCallback(async (id, name) => {
    if (!window.confirm(`Delete "${name}" from inventory?`)) return
    await deleteInventory(id)
    await addAuditLog('delete_inventory', user.uid, { name })
    await loadItems()
  }, [loadItems, user])

  const categories = useMemo(() => {
    const set = new Set(items.map((i) => i.category).filter(Boolean))
    return ['all', ...Array.from(set)]
  }, [items])

  const filtered = useMemo(() => {
    const s = search.toLowerCase()
    return items.filter((i) => {
      const matchesSearch = !search ||
        i.itemCode?.toLowerCase().includes(s) ||
        i.name?.toLowerCase().includes(s) ||
        i.category?.toLowerCase().includes(s) ||
        i.supplier?.toLowerCase().includes(s)
      const matchesCategory = filterCategory === 'all' || i.category === filterCategory
      const qty = Number(i.quantity) || 0
      const reorder = Number(i.reorderLevel) || 0
      let matchesStock = true
      if (filterStock === 'low') matchesStock = reorder > 0 && qty <= reorder
      else if (filterStock === 'out') matchesStock = qty === 0
      else if (filterStock === 'available') matchesStock = qty > 0
      return matchesSearch && matchesCategory && matchesStock
    })
  }, [items, search, filterCategory, filterStock])

  const totalPages = useMemo(() => Math.ceil(filtered.length / ITEMS_PER_PAGE), [filtered])
  const paginated = useMemo(() => filtered.slice((page - 1) * ITEMS_PER_PAGE, page * ITEMS_PER_PAGE), [filtered, page])

  const lowStockCount = items.filter((i) => {
    const qty = Number(i.quantity) || 0
    const reorder = Number(i.reorderLevel) || 0
    return reorder > 0 && qty <= reorder
  }).length

  const outOfStockCount = items.filter((i) => (Number(i.quantity) || 0) === 0).length

  const exportColumns = [
    { key: 'itemCode', label: 'Item Code' },
    { key: 'name', label: 'Item Name' },
    { key: 'category', label: 'Category' },
    { key: 'quantity', label: 'Stock' },
    { key: 'unit', label: 'Unit' },
    { key: 'buyingPrice', label: 'Purchase Price' },
    { key: 'sellingPrice', label: 'Sales Price' },
    { key: 'reorderLevel', label: 'Reorder Level' },
    { key: 'binLocation', label: 'Bin Location' },
    { key: 'supplier', label: 'Supplier' },
  ]

  if (loading) return <LoadingSpinner size="lg" />

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Inventory</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowImport(true)}
            className="flex items-center gap-2 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 text-sm font-medium"
          >
            <Upload className="w-4 h-4" />
            Import
          </button>
          <ExportButton data={filtered} filename="inventory" columns={exportColumns} />
          <button
            onClick={() => setShowForm(true)}
            className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
          >
            <Plus className="w-4 h-4" />
            Add Item
          </button>
        </div>
      </div>

      {lowStockCount > 0 && (
        <div className="flex flex-wrap gap-3">
          <div className="flex items-center gap-2 px-4 py-2.5 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg text-sm text-red-700 dark:text-red-400">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{outOfStockCount} out of stock</span>
          </div>
          <div className="flex items-center gap-2 px-4 py-2.5 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg text-sm text-yellow-700 dark:text-yellow-400">
            <Package className="w-4 h-4 shrink-0" />
            <span>{lowStockCount} items below reorder level</span>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1) }}
            placeholder="Search by name, category, supplier..."
            className="w-full pl-9 pr-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
        <select
          value={filterCategory}
          onChange={(e) => { setFilterCategory(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="all">All Categories</option>
          {categories.filter((c) => c !== 'all').map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
        <select
          value={filterStock}
          onChange={(e) => { setFilterStock(e.target.value); setPage(1) }}
          className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-sm text-gray-900 dark:text-white"
        >
          <option value="all">All Stock</option>
          <option value="available">Available</option>
          <option value="low">Low Stock</option>
          <option value="out">Out of Stock</option>
        </select>
      </div>

      <div className="bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
              <thead>
                <tr className="bg-gray-50 dark:bg-gray-900/50">
                  <th className="text-left px-3 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Sl</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Item Code</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Item Name</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Stock</th>
                  <th className="hidden md:table-cell text-left px-3 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Purchase Price</th>
                  <th className="hidden md:table-cell text-left px-3 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Sales Price</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Bin Location</th>
                  <th className="text-left px-3 py-3 font-medium text-gray-500 dark:text-gray-400 text-xs">Actions</th>
                </tr>
              </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-8 text-center text-gray-500 dark:text-gray-400">No inventory items found</td>
                </tr>
              ) : (
                paginated.map((item, idx) => {
                  const qty = Number(item.quantity) || 0
                  const reorder = Number(item.reorderLevel) || 0
                  const isLow = reorder > 0 && qty <= reorder
                  const isOut = qty === 0

                  return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 text-xs">{idx + 1 + (page - 1) * ITEMS_PER_PAGE}</td>
                      <td className="px-3 py-3 text-gray-600 dark:text-gray-400 text-xs font-mono">{item.itemCode || '-'}</td>
                      <td className="px-3 py-3">
                        <span className="font-medium text-gray-900 dark:text-white">{item.name}</span>
                        {item.supplier && (
                          <span className="text-gray-400 text-xs block">{item.supplier}</span>
                        )}
                      </td>
                      <td className="px-3 py-3">
                        {isOut ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-red-600 dark:text-red-400 bg-red-50 dark:bg-red-900/20 px-2 py-0.5 rounded-full">
                            <AlertTriangle className="w-3 h-3" /> Out of Stock
                          </span>
                        ) : isLow ? (
                          <span className="inline-flex items-center gap-1 text-xs font-medium text-yellow-600 dark:text-yellow-400 bg-yellow-50 dark:bg-yellow-900/20 px-2 py-0.5 rounded-full">
                            <Package className="w-3 h-3" /> {qty} {item.unit}
                          </span>
                        ) : (
                          <span className="text-xs font-medium text-green-600 dark:text-green-400 bg-green-50 dark:bg-green-900/20 px-2 py-0.5 rounded-full">
                            {qty} {item.unit}
                          </span>
                        )}
                      </td>
                      <td className="hidden md:table-cell px-3 py-3 text-gray-600 dark:text-gray-400">
                        {item.buyingPrice ? `BDT ${Number(item.buyingPrice).toLocaleString()}` : '-'}
                      </td>
                      <td className="hidden md:table-cell px-3 py-3 text-gray-600 dark:text-gray-400">
                        {item.sellingPrice ? `BDT ${Number(item.sellingPrice).toLocaleString()}` : '-'}
                      </td>
                      <td className="px-3 py-3 text-gray-500 dark:text-gray-400 text-xs">{item.binLocation || '-'}</td>
                      <td className="px-3 py-3">
                        {isAdmin && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setEditItem(item)}
                              className="p-1.5 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/30 text-blue-600"
                              title="Edit"
                            >
                              <Edit className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="p-1.5 rounded-lg hover:bg-red-100 dark:hover:bg-red-900/30 text-red-600"
                              title="Delete"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        )}
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

      <Modal open={showForm} onClose={() => setShowForm(false)} title="" size="lg">
        <InventoryForm onSubmit={handleAdd} onClose={() => setShowForm(false)} />
      </Modal>

      <Modal open={!!editItem} onClose={() => setEditItem(null)} title="" size="lg">
        <InventoryForm onSubmit={handleEdit} onClose={() => setEditItem(null)} initialData={editItem} />
      </Modal>

      <ImportInventoryModal open={showImport} onClose={() => setShowImport(false)} onImport={handleAdd} />
    </div>
  )
}
